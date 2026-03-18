"""
Chat service — conversations and messages.
All returned dicts have string 'id' fields, never ObjectId.
"""
from datetime import datetime
from bson import ObjectId
from utils.db import get_db


def create_dm_conversation(uid_a: str, uid_b: str) -> dict:
    db = get_db()
    participants = sorted([uid_a, uid_b])
    existing = db.conversations.find_one({"type": "direct", "participants": participants})
    if existing:
        existing["id"] = str(existing.pop("_id"))
        return existing
    now = datetime.utcnow()
    doc = {
        "type": "direct", "participants": participants,
        "group_name": None, "group_avatar": None, "admin_uids": None,
        "last_message": None, "created_at": now, "updated_at": now,
    }
    result = db.conversations.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


def get_user_conversations(uid: str) -> list:
    db = get_db()
    convs = list(db.conversations.find({"participants": uid}, sort=[("updated_at", -1)]))
    for c in convs:
        c["id"] = str(c.pop("_id"))
    return convs


def get_conversation_by_id(conversation_id: str, uid: str) -> dict | None:
    db = get_db()
    try:
        oid = ObjectId(conversation_id)
    except Exception:
        return None
    conv = db.conversations.find_one({"_id": oid, "participants": uid})
    if conv:
        conv["id"] = str(conv.pop("_id"))
    return conv


def add_message(conversation_id: str, sender_uid: str,
                msg_type: str, content: str,
                reply_to_id: str | None = None) -> dict:
    db = get_db()
    now = datetime.utcnow()
    msg_doc = {
        "conversation_id": ObjectId(conversation_id),
        "sender_uid": sender_uid,
        "type": msg_type,
        "content": content,
        "media_url": None,
        "reply_to_id": ObjectId(reply_to_id) if reply_to_id else None,
        "status": "sent",
        "read_by": [],
        "is_deleted_for_all": False,
        "deleted_for": [],
        "created_at": now,
    }
    result = db.messages.insert_one(msg_doc)
    # Return clean dict — string ids, no ObjectId anywhere
    return {
        "id": str(result.inserted_id),
        "conversation_id": conversation_id,
        "sender_uid": sender_uid,
        "type": msg_type,
        "content": content,
        "media_url": None,
        "reply_to_id": reply_to_id,
        "status": "sent",
        "read_by": [],
        "is_deleted_for_all": False,
        "deleted_for": [],
        "created_at": now,
    }


def get_messages_paginated(conversation_id: str, before_id: str | None,
                           limit: int = 50) -> tuple[list, bool]:
    db = get_db()
    query: dict = {"conversation_id": ObjectId(conversation_id)}
    if before_id:
        try:
            query["_id"] = {"$lt": ObjectId(before_id)}
        except Exception:
            pass

    raw = list(db.messages.find(query, sort=[("_id", -1)]).limit(limit + 1))
    has_more = len(raw) > limit
    messages = raw[:limit]
    messages.reverse()

    result = []
    for m in messages:
        result.append({
            "id": str(m["_id"]),
            "conversation_id": str(m["conversation_id"]),
            "sender_uid": m["sender_uid"],
            "type": m.get("type", "text"),
            "content": m.get("content", ""),
            "media_url": m.get("media_url"),
            "reply_to_id": str(m["reply_to_id"]) if m.get("reply_to_id") else None,
            "status": m.get("status", "sent"),
            "read_by": m.get("read_by", []),
            "is_deleted_for_all": m.get("is_deleted_for_all", False),
            "deleted_for": m.get("deleted_for", []),
            "created_at": m["created_at"],
        })
    return result, has_more