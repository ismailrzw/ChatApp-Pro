from datetime import datetime
from flask import Blueprint, jsonify, g
from middleware.auth_middleware import require_auth, get_current_uid
from utils.db import get_db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/auth/verify', methods=['POST'])
@require_auth
def verify_user():
    uid = get_current_uid()
    db = get_db()

    existing_user = db.users.find_one({"firebase_uid": uid})
    if existing_user and existing_user.get("is_banned"):
        return jsonify({"error": "Account suspended"}), 403

    # g.current_user is set by require_auth from the decoded Firebase token
    decoded = g.current_user
    email = decoded.get("email", "") if decoded else ""
    display_name = email.split("@")[0] if email else "User"

    now = datetime.utcnow()
    db.users.update_one(
        {"firebase_uid": uid},
        {
            "$setOnInsert": {
                "firebase_uid": uid,
                "email": email,
                "display_name": display_name,
                "avatar_url": None,
                "status_message": "",
                "role": "user",
                "is_banned": False,
                "created_at": now,
                "visibility": {"last_seen": "everyone"},
            },
            "$set": {
                "last_seen": now,
            }
        },
        upsert=True
    )

    user = db.users.find_one({"firebase_uid": uid}, {"_id": 0})
    return jsonify(user), 200