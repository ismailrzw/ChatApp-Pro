"""
Socket.IO event handlers.
Online/offline is purely socket-driven:
  connect    → is_online=True  broadcast to all
  disconnect → is_online=False broadcast to all
"""
from datetime import datetime
from flask import request
from flask_socketio import emit, join_room, leave_room
from extensions import socketio
from services.chat_service import get_conversation_by_id, add_message
from utils.db import get_db

_sid_to_uid: dict = {}


def get_socket_uid(sid: str):
    return _sid_to_uid.get(sid)


@socketio.on("connect")
def handle_connect(auth):
    token = None
    if isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        token = request.args.get("token")
    if not token:
        return False

    from services.auth_service import verify_token
    try:
        decoded = verify_token(token)
        uid = decoded.get("uid") or decoded.get("user_id") if isinstance(decoded, dict) else decoded
    except Exception as e:
        print(f"[Socket] Auth failed: {e}")
        return False

    if not uid:
        return False

    sid = request.sid
    _sid_to_uid[sid] = uid
    join_room(uid)

    # Mark online in DB
    try:
        db = get_db()
        db.users.update_one(
            {"firebase_uid": uid},
            {"$set": {"is_online": True, "last_seen": datetime.utcnow()}},
        )
    except Exception as e:
        print(f"[Socket] DB update on connect failed: {e}")

    # Broadcast to ALL connected clients — this is how contacts see each other online
    emit("user:online", {"firebase_uid": uid, "is_online": True}, broadcast=True)
    print(f"[Socket] {uid} connected → online")


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    uid = _sid_to_uid.pop(sid, None)
    if not uid:
        return

    # Mark offline in DB with last_seen timestamp
    try:
        db = get_db()
        db.users.update_one(
            {"firebase_uid": uid},
            {"$set": {"is_online": False, "last_seen": datetime.utcnow()}},
        )
    except Exception as e:
        print(f"[Socket] DB update on disconnect failed: {e}")

    # Broadcast offline to ALL — contacts will see the status change immediately
    emit("user:online", {"firebase_uid": uid, "is_online": False}, broadcast=True)
    print(f"[Socket] {uid} disconnected → offline")


@socketio.on("ping")
def handle_ping():
    emit("pong", {"ts": datetime.utcnow().isoformat()})


@socketio.on("join_conversation")
def handle_join_conversation(data):
    sid = request.sid
    uid = get_socket_uid(sid)
    if not uid:
        emit("error", {"code": "UNAUTHENTICATED", "message": "Not authenticated"})
        return

    conversation_id = (data or {}).get("conversation_id")
    if not conversation_id:
        emit("error", {"code": "MISSING_FIELD", "message": "conversation_id required"})
        return

    try:
        conv = get_conversation_by_id(conversation_id, uid)
    except Exception as e:
        print(f"[Socket] join_conversation error: {e}")
        emit("error", {"code": "DB_ERROR", "message": "Database error"})
        return

    if not conv:
        emit("error", {"code": "NOT_FOUND", "message": "Conversation not found or access denied"})
        return

    join_room(conversation_id)
    emit("conversation:joined", {"conversation_id": conversation_id})


@socketio.on("leave_conversation")
def handle_leave_conversation(data):
    conversation_id = (data or {}).get("conversation_id")
    if conversation_id:
        leave_room(conversation_id)
        emit("conversation:left", {"conversation_id": conversation_id})


@socketio.on("send_message")
def handle_send_message(data):
    sid = request.sid
    uid = get_socket_uid(sid)
    if not uid:
        emit("error", {"code": "UNAUTHENTICATED", "message": "Not authenticated"})
        return

    data = data or {}
    conversation_id = data.get("conversation_id")
    msg_type = data.get("type", "text")
    content = (data.get("content") or "").strip()
    reply_to_id = data.get("reply_to_id")
    temp_id = data.get("temp_id")

    if not conversation_id:
        emit("error", {"code": "MISSING_FIELD", "message": "conversation_id required"})
        return
    if msg_type not in ("text", "image", "file"):
        emit("error", {"code": "INVALID_TYPE", "message": "Invalid message type"})
        return
    if msg_type == "text" and not content:
        emit("error", {"code": "EMPTY_CONTENT", "message": "Message content cannot be empty"})
        return
    if len(content) > 4000:
        emit("error", {"code": "TOO_LONG", "message": "Message exceeds 4000 characters"})
        return

    try:
        conv = get_conversation_by_id(conversation_id, uid)
    except Exception:
        emit("error", {"code": "DB_ERROR", "message": "Database error"})
        return

    if not conv:
        emit("error", {"code": "NOT_FOUND", "message": "Conversation not found"})
        return

    try:
        db = get_db()
        user = db.users.find_one({"firebase_uid": uid}, {"is_banned": 1})
        if user and user.get("is_banned"):
            emit("error", {"code": "BANNED", "message": "Account suspended"})
            return
    except Exception:
        pass

    try:
        msg_doc = add_message(
            conversation_id=conversation_id,
            sender_uid=uid,
            msg_type=msg_type,
            content=content,
            reply_to_id=reply_to_id,
        )
    except Exception as e:
        print(f"[Socket] persist failed: {e}")
        emit("error", {"code": "PERSIST_FAILED", "message": "Failed to save message"})
        return

    msg_payload = {
        "id": msg_doc["id"],
        "conversation_id": conversation_id,
        "sender_uid": uid,
        "type": msg_type,
        "content": content,
        "media_url": None,
        "reply_to_id": reply_to_id,
        "status": "sent",
        "read_by": [],
        "is_deleted_for_all": False,
        "deleted_for": [],
        "created_at": msg_doc["created_at"].isoformat(),
    }

    emit("message:receive", {"message": msg_payload}, to=conversation_id)
    emit("message:ack", {"temp_id": temp_id, "message_id": msg_doc["id"]})