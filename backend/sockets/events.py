from flask_socketio import emit, join_room, leave_room
from flask import request, session
from services.auth_service import verify_token
from utils.db import get_db
from datetime import datetime

def register_socket_events(socketio):
    @socketio.on("connect")
    def handle_connect(auth):
        token = (auth or {}).get("token")
        if not token:
            print(f"[Socket] Connect rejected: No token ({request.sid})")
            return False  # reject connection
        try:
            decoded = verify_token(token)
            uid = decoded["uid"]
            
            # Store uid in session
            session["uid"] = uid
            
            db = get_db()
            # Update last_seen in MongoDB
            db.users.update_one({"firebase_uid": uid}, {"$set": {"last_seen": datetime.utcnow().isoformat() + "Z"}})
            
            # Join personal room
            join_room(uid)
            
            # Broadcast to all connected clients that this user is online
            emit("user:online", {"user_id": uid, "is_online": True}, broadcast=True, include_self=False)
            print(f"[Socket] Connected and authenticated: {uid} ({request.sid})")
        except ValueError as e:
            print(f"[Socket] Connect rejected: Invalid token - {str(e)} ({request.sid})")
            return False  # reject invalid token
        except Exception as e:
            print(f"[Socket] Connect rejected: {str(e)} ({request.sid})")
            return False

    @socketio.on("disconnect")
    def handle_disconnect():
        uid = session.get("uid")
        if uid:
            db = get_db()
            db.users.update_one({"firebase_uid": uid}, {"$set": {"last_seen": datetime.utcnow().isoformat() + "Z"}})
            emit("user:online", {"user_id": uid, "is_online": False}, broadcast=True, include_self=False)
            print(f"[Socket] Disconnected: {uid}")
        else:
            print(f"[Socket] Client disconnected: {request.sid}")
        
    @socketio.on("ping_server")
    def handle_ping():
        emit("pong_client", {"data": "connected"})
