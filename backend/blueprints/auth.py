from flask import Blueprint, jsonify, g
from datetime import datetime
from middleware.auth_middleware import require_auth, get_current_uid
from utils.db import get_db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/verify', methods=['POST'])
@require_auth
def verify_user():
    uid = get_current_uid()
    email = g.current_user.get("email", "")
    db = get_db()
    
    # Check if user is banned
    existing_user = db.users.find_one({"firebase_uid": uid})
    if existing_user and existing_user.get("is_banned"):
        return jsonify({"error": "Account suspended"}), 403
        
    # Upsert user document
    now = datetime.utcnow()
    db.users.update_one(
        {"firebase_uid": uid},
        {
            "$setOnInsert": {
                "firebase_uid": uid,
                "email": email,
                "display_name": email.split("@")[0] if email else "User",
                "avatar_url": None,
                "status_message": "",
                "role": "user",
                "is_banned": False,
                "created_at": now,
                "visibility": {"last_seen": "everyone"},
            },
            "$set": {
                "last_seen": now
            }
        },
        upsert=True
    )
    
    user = db.users.find_one({"firebase_uid": uid}, {"_id": 0})
    return jsonify(user), 200
