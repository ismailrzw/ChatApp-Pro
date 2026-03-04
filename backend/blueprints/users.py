import os
import uuid
import re
from flask import Blueprint, jsonify, request, current_app
from middleware.auth_middleware import require_auth, get_current_uid
from utils.db import get_db
from models.user_model import UpdateProfileSchema, UserSearchResultSchema
from marshmallow import ValidationError
from utils.helpers import allowed_image_mimetype
from pathlib import Path

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # 2MB

@users_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    uid = get_current_uid()
    db = get_db()
    
    user_doc = db.users.find_one({"firebase_uid": uid}, {"_id": 0})
    if not user_doc:
        return jsonify({"error": "User profile not found"}), 404
        
    return jsonify(user_doc), 200

@users_bp.route('/me', methods=['PUT'])
@require_auth
def update_me():
    uid = get_current_uid()
    db = get_db()
    
    schema = UpdateProfileSchema()
    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400
        
    if data:
        db.users.update_one({"firebase_uid": uid}, {"$set": data})
    
    updated_user = db.users.find_one({"firebase_uid": uid}, {"_id": 0})
    return jsonify(updated_user), 200

@users_bp.route('/me/avatar', methods=['POST'])
@require_auth
def upload_avatar():
    uid = get_current_uid()
    db = get_db()
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    # Check file size (approximate)
    file_content = file.read()
    if len(file_content) > MAX_CONTENT_LENGTH:
        return jsonify({"error": "File size exceeds 2MB limit"}), 400
        
    # Check MIME type
    if not allowed_image_mimetype(file_content):
        return jsonify({"error": "Invalid file type. JPEG and PNG only."}), 400
        
    # Storage
    upload_dir = Path(current_app.root_path) / "uploads" / "avatars" / uid
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    extension = os.path.splitext(file.filename)[1].lower()
    if not extension:
        # Fallback based on content type if extension is missing
        extension = '.jpg' # Simple fallback
        
    filename = f"{uuid.uuid4()}{extension}"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        f.write(file_content)
        
    # Build URL
    avatar_url = f"/api/media/avatars/{uid}/{filename}"
    
    # Get old avatar and delete it
    user = db.users.find_one({"firebase_uid": uid})
    old_avatar_url = user.get('avatar_url')
    if old_avatar_url:
        try:
            # Parse filename from URL: /api/media/avatars/{uid}/{filename}
            old_filename = old_avatar_url.split('/')[-1]
            old_file_path = upload_dir / old_filename
            if old_file_path.exists():
                os.remove(old_file_path)
        except Exception as e:
            current_app.logger.error(f"Failed to delete old avatar: {e}")
            
    # Update DB
    db.users.update_one({"firebase_uid": uid}, {"$set": {"avatar_url": avatar_url}})
    
    return jsonify({"avatar_url": avatar_url}), 200

@users_bp.route('/search', methods=['GET'])
@require_auth
def search_users():
    uid = get_current_uid()
    db = get_db()
    
    q = request.args.get('q', '').strip()
    if not q or len(q) < 2:
        return jsonify([]), 200
        
    # TODO S6: replace with text index for better performance
    pattern = {"$regex": re.escape(q), "$options": "i"}
    results = db.users.find(
        {
            "$and": [
                {"firebase_uid": {"$ne": uid}},   # exclude self
                {"is_banned": {"$ne": True}},      # exclude banned users
                {"$or": [{"display_name": pattern}, {"email": pattern}]}
            ]
        },
        {"_id": 0, "firebase_uid": 1, "display_name": 1, 
         "email": 1, "avatar_url": 1, "status_message": 1}
    ).limit(20)
    
    schema = UserSearchResultSchema(many=True)
    return jsonify(schema.dump(list(results))), 200
