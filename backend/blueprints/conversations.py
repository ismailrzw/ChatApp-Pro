"""
Blueprint: /api/conversations
Handles conversation creation, listing, and message history retrieval.
"""
from flask import Blueprint, request, jsonify, g
from marshmallow import ValidationError

from middleware.auth_middleware import require_auth, get_current_uid
from models.conversation_model import CreateConversationSchema, ConversationResponseSchema
from models.message_model import MessageResponseSchema
from services.chat_service import (
    create_dm_conversation,
    get_user_conversations,
    get_conversation_by_id,
    get_messages_paginated,
)
from utils.db import get_db

conversations_bp = Blueprint("conversations", __name__)

_create_schema = CreateConversationSchema()
_conv_schema = ConversationResponseSchema()
_conv_many_schema = ConversationResponseSchema(many=True)
_msg_schema = MessageResponseSchema(many=True)


@conversations_bp.route("/api/conversations", methods=["POST"])
@require_auth
def create_conversation():
    """
    POST /api/conversations
    Create (or return existing) DM conversation between the authenticated user
    and another user. Idempotent — returns HTTP 200 whether new or existing.
    """
    uid = get_current_uid()
    body = request.get_json(silent=True) or {}

    try:
        data = _create_schema.load(body)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    conv_type = data["type"]

    if conv_type != "direct":
        return jsonify({"error": "Only 'direct' conversations are supported in Sprint 3"}), 400

    participant_uid = data.get("participant_uid")
    if not participant_uid:
        return jsonify({"error": "participant_uid is required for direct conversations"}), 400

    if participant_uid == uid:
        return jsonify({"error": "Cannot create conversation with yourself"}), 400

    db = get_db()

    # Verify participant exists
    other_user = db.users.find_one({"firebase_uid": participant_uid})
    if not other_user:
        return jsonify({"error": "User not found"}), 404

    # Verify accepted contact relationship
    contact = db.contacts.find_one({
        "$or": [
            {"requester_uid": uid, "addressee_uid": participant_uid},
            {"requester_uid": participant_uid, "addressee_uid": uid},
        ],
        "status": "accepted",
    })
    if not contact:
        return jsonify({"error": "You must be contacts first"}), 403

    conv = create_dm_conversation(uid, participant_uid)

    # Attach other_user for response enrichment
    conv["other_user"] = {
        "firebase_uid": other_user.get("firebase_uid"),
        "display_name": other_user.get("display_name"),
        "avatar_url": other_user.get("avatar_url"),
    }

    return jsonify(_conv_schema.dump(conv)), 200


@conversations_bp.route("/api/conversations", methods=["GET"])
@require_auth
def list_conversations():
    """
    GET /api/conversations
    Return all conversations for the authenticated user, enriched with other_user
    metadata for DMs. Sorted by updated_at descending.
    """
    uid = get_current_uid()
    convs = get_user_conversations(uid)

    if convs:
        db = get_db()
        # Collect all other participant UIDs in one pass
        other_uids = []
        for c in convs:
            if c.get("type") == "direct":
                participants = c.get("participants", [])
                other = next((p for p in participants if p != uid), None)
                if other:
                    other_uids.append(other)

        # Single $in query instead of N queries
        user_map: dict = {}
        if other_uids:
            users = db.users.find(
                {"firebase_uid": {"$in": other_uids}},
                {"_id": 0, "firebase_uid": 1, "display_name": 1, "avatar_url": 1},
            )
            user_map = {u["firebase_uid"]: u for u in users}

        for c in convs:
            if c.get("type") == "direct":
                participants = c.get("participants", [])
                other_uid = next((p for p in participants if p != uid), None)
                c["other_user"] = user_map.get(other_uid)
            else:
                c["other_user"] = None

    return jsonify(_conv_many_schema.dump(convs)), 200


@conversations_bp.route("/api/conversations/<conversation_id>/messages", methods=["GET"])
@require_auth
def get_messages(conversation_id: str):
    """
    GET /api/conversations/<id>/messages?before_id=<cursor>&limit=<n>
    Return paginated messages for a conversation the authenticated user participates in.
    """
    uid = get_current_uid()

    # Validate ObjectId format
    from bson import ObjectId
    try:
        ObjectId(conversation_id)
    except Exception:
        return jsonify({"error": "Invalid conversation ID"}), 400

    # Verify conversation exists and user is a participant
    conv = get_conversation_by_id(conversation_id, uid)
    if not conv:
        # Distinguish between not found and not a participant
        db = get_db()
        try:
            exists = db.conversations.find_one({"_id": ObjectId(conversation_id)})
        except Exception:
            exists = None
        if not exists:
            return jsonify({"error": "Conversation not found"}), 404
        return jsonify({"error": "Access denied"}), 403

    before_id = request.args.get("before_id") or None
    try:
        limit = min(int(request.args.get("limit", 50)), 50)
    except ValueError:
        limit = 50

    messages, has_more = get_messages_paginated(conversation_id, before_id, limit)

    next_cursor = messages[0]["id"] if (has_more and messages) else None

    return jsonify({
        "messages": _msg_schema.dump(messages),
        "has_more": has_more,
        "next_cursor": next_cursor,
    }), 200