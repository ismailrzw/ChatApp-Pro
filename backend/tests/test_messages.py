"""
Sprint 3 backend tests — conversations and messages.
Run: pytest tests/test_messages.py -v
Expected: 18 tests pass.
"""
import pytest
from datetime import datetime
from bson import ObjectId

from utils.db import get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def seeded_conversation(seeded_users, app):
    """Create accepted contact + DM conversation between alice and bob."""
    with app.app_context():
        db = get_db()
        db.contacts.insert_one({
            "requester_uid": "uid-alice",
            "addressee_uid": "uid-bob",
            "status": "accepted",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
        from services.chat_service import create_dm_conversation
        conv = create_dm_conversation("uid-alice", "uid-bob")
        yield conv
        db.conversations.delete_many({})
        db.messages.delete_many({})
        db.contacts.delete_many({})


@pytest.fixture
def seeded_messages(seeded_conversation, app):
    """Insert 60 test messages into the seeded conversation."""
    with app.app_context():
        db = get_db()
        conv_id = seeded_conversation["_id"]
        messages = [
            {
                "conversation_id": conv_id,
                "sender_uid": "uid-alice" if i % 2 == 0 else "uid-bob",
                "type": "text",
                "content": f"Message {i}",
                "media_url": None,
                "reply_to_id": None,
                "status": "sent",
                "read_by": [],
                "is_deleted_for_all": False,
                "deleted_for": [],
                "created_at": datetime.utcnow(),
            }
            for i in range(60)
        ]
        db.messages.insert_many(messages)
        yield messages


# ---------------------------------------------------------------------------
# POST /api/conversations
# ---------------------------------------------------------------------------

def test_create_dm_success(client, alice_token, seeded_users, app):
    """Happy path: Alice creates a DM with Bob (they are contacts)."""
    with app.app_context():
        db = get_db()
        db.contacts.insert_one({
            "requester_uid": "uid-alice",
            "addressee_uid": "uid-bob",
            "status": "accepted",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })

    resp = client.post(
        "/api/conversations",
        json={"type": "direct", "participant_uid": "uid-bob"},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["type"] == "direct"
    assert "uid-alice" in data["participants"]
    assert "uid-bob" in data["participants"]


def test_create_dm_idempotent(client, alice_token, seeded_conversation):
    """Calling create twice returns the same conversation id."""
    resp1 = client.post(
        "/api/conversations",
        json={"type": "direct", "participant_uid": "uid-bob"},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    resp2 = client.post(
        "/api/conversations",
        json={"type": "direct", "participant_uid": "uid-bob"},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.get_json()["id"] == resp2.get_json()["id"]


def test_create_dm_non_contact(client, alice_token, seeded_users):
    """Alice tries to DM Carol (not a contact) → 403."""
    resp = client.post(
        "/api/conversations",
        json={"type": "direct", "participant_uid": "uid-carol"},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp.status_code == 403


def test_create_dm_self(client, alice_token, seeded_users):
    """Alice tries to DM herself → 400."""
    resp = client.post(
        "/api/conversations",
        json={"type": "direct", "participant_uid": "uid-alice"},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp.status_code == 400


def test_create_dm_unknown_participant(client, alice_token):
    """Unknown UID → 404."""
    resp = client.post(
        "/api/conversations",
        json={"type": "direct", "participant_uid": "uid-ghost"},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/conversations
# ---------------------------------------------------------------------------

def test_get_conversations_sorted_by_updated_at(client, alice_token, seeded_conversation, app):
    """Conversations returned newest-first."""
    resp = client.get(
        "/api/conversations",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp.status_code == 200
    convs = resp.get_json()
    assert isinstance(convs, list)
    if len(convs) > 1:
        for i in range(len(convs) - 1):
            assert convs[i]["updated_at"] >= convs[i + 1]["updated_at"]


def test_get_conversations_enriched_with_other_user(client, alice_token, seeded_conversation):
    """Each DM conversation includes other_user with display_name."""
    resp = client.get(
        "/api/conversations",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp.status_code == 200
    convs = resp.get_json()
    assert len(convs) >= 1
    dm = next((c for c in convs if c["type"] == "direct"), None)
    assert dm is not None
    assert dm.get("other_user") is not None
    assert "display_name" in dm["other_user"]


def test_get_conversations_excludes_non_participant(client, seeded_users, seeded_conversation, app):
    """Carol's conversation list does not include Alice-Bob conversation."""
    from unittest.mock import patch

    with patch("middleware.auth_middleware.verify_token", return_value="uid-carol"):
        resp = client.get(
            "/api/conversations",
            headers={"Authorization": "Bearer carol-token"},
        )
    assert resp.status_code == 200
    convs = resp.get_json()
    conv_ids = [c["id"] for c in convs]
    # The Alice-Bob conversation id should not appear
    alice_bob_id = seeded_conversation.get("id") or str(seeded_conversation.get("_id", ""))
    assert alice_bob_id not in conv_ids


# ---------------------------------------------------------------------------
# GET /api/conversations/<id>/messages
# ---------------------------------------------------------------------------

def test_get_messages_first_page(client, alice_token, seeded_conversation, seeded_messages):
    """60 messages → first page returns 50, has_more=True."""
    conv_id = seeded_conversation.get("id") or str(seeded_conversation["_id"])
    resp = client.get(
        f"/api/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body["messages"]) == 50
    assert body["has_more"] is True
    assert body["next_cursor"] is not None


def test_get_messages_second_page_cursor(client, alice_token, seeded_conversation, seeded_messages):
    """Second page via cursor returns remaining 10, has_more=False."""
    conv_id = seeded_conversation.get("id") or str(seeded_conversation["_id"])
    page1 = client.get(
        f"/api/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
    ).get_json()

    page2 = client.get(
        f"/api/conversations/{conv_id}/messages",
        query_string={"before_id": page1["next_cursor"]},
        headers={"Authorization": f"Bearer {alice_token}"},
    ).get_json()

    assert len(page2["messages"]) == 10
    assert page2["has_more"] is False


def test_get_messages_has_more_false(client, alice_token, seeded_conversation, app):
    """Exactly 50 messages → has_more=False."""
    with app.app_context():
        db = get_db()
        conv_id = seeded_conversation["_id"]
        db.messages.delete_many({"conversation_id": conv_id})
        db.messages.insert_many([
            {
                "conversation_id": conv_id,
                "sender_uid": "uid-alice",
                "type": "text",
                "content": f"msg {i}",
                "media_url": None,
                "reply_to_id": None,
                "status": "sent",
                "read_by": [],
                "is_deleted_for_all": False,
                "deleted_for": [],
                "created_at": datetime.utcnow(),
            }
            for i in range(50)
        ])

    id_str = seeded_conversation.get("id") or str(seeded_conversation["_id"])
    resp = client.get(
        f"/api/conversations/{id_str}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp.get_json()["has_more"] is False


def test_get_messages_non_participant(client, seeded_conversation):
    """Non-participant access → 403."""
    from unittest.mock import patch

    conv_id = seeded_conversation.get("id") or str(seeded_conversation["_id"])
    with patch("middleware.auth_middleware.verify_token", return_value="uid-carol"):
        resp = client.get(
            f"/api/conversations/{conv_id}/messages",
            headers={"Authorization": "Bearer carol-token"},
        )
    assert resp.status_code == 403


def test_get_messages_invalid_conv_id(client, alice_token):
    """Garbage conversation ID → 400."""
    resp = client.get(
        "/api/conversations/not-a-valid-id/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Service-level tests
# ---------------------------------------------------------------------------

def test_add_message_persists_to_db(app, seeded_conversation):
    """add_message() inserts a document in the messages collection."""
    with app.app_context():
        from services.chat_service import add_message
        db = get_db()
        conv_id = seeded_conversation.get("id") or str(seeded_conversation["_id"])
        msg = add_message(conv_id, "uid-alice", "text", "hello world")
        assert msg.get("id") is not None
        doc = db.messages.find_one({"_id": ObjectId(msg["id"])})
        assert doc is not None
        assert doc["content"] == "hello world"


def test_add_message_updates_last_message(app, seeded_conversation):
    """add_message() updates conversation.last_message and updated_at."""
    with app.app_context():
        from services.chat_service import add_message
        db = get_db()
        conv_id = seeded_conversation.get("id") or str(seeded_conversation["_id"])
        add_message(conv_id, "uid-alice", "text", "update check")
        conv = db.conversations.find_one({"_id": seeded_conversation["_id"]})
        assert conv["last_message"]["text"] == "update check"
        assert conv["updated_at"] is not None


def test_send_message_empty_content(socketio_client):
    """send_message with empty content emits error to sender only."""
    received = []
    socketio_client.on("error", lambda d: received.append(d))
    socketio_client.emit("send_message", {
        "conversation_id": "fake-id",
        "type": "text",
        "content": "   ",
    })
    assert any(e.get("code") == "EMPTY_CONTENT" for e in received)


def test_send_message_too_long(socketio_client, seeded_conversation, alice_token):
    """4001-char message → TOO_LONG error."""
    received = []
    socketio_client.on("error", lambda d: received.append(d))
    conv_id = seeded_conversation.get("id") or str(seeded_conversation["_id"])
    socketio_client.emit("send_message", {
        "conversation_id": conv_id,
        "type": "text",
        "content": "x" * 4001,
    })
    assert any(e.get("code") == "TOO_LONG" for e in received)


def test_pagination_service_ascending_order(app, seeded_conversation, seeded_messages):
    """get_messages_paginated returns messages in oldest-first order."""
    with app.app_context():
        from services.chat_service import get_messages_paginated
        conv_id = seeded_conversation.get("id") or str(seeded_conversation["_id"])
        msgs, _ = get_messages_paginated(conv_id, None, 50)
        assert len(msgs) == 50
        for i in range(len(msgs) - 1):
            assert msgs[i]["created_at"] <= msgs[i + 1]["created_at"]