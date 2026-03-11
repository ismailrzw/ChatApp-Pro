from flask import Blueprint, jsonify, request
from middleware.auth_middleware import require_auth, get_current_uid
from utils.db import get_db
from bson import ObjectId
from datetime import datetime
from extensions import socketio

contacts_bp = Blueprint('contacts', __name__, url_prefix='/api/contacts')

@contacts_bp.route('', methods=['GET'])
@require_auth
def get_contacts():
    uid = get_current_uid()
    db = get_db()
    
    # Find all relationships where user is requester OR addressee
    # We return everything (accepted, pending, blocked) and let the frontend filter
    contacts = list(db.contacts.find(
        {
            "$or": [
                {"requester_uid": uid},
                {"addressee_uid": uid}
            ]
        }
    ))
    
    enriched_contacts = []
    for contact in contacts:
        other_uid = contact['addressee_uid'] if contact['requester_uid'] == uid else contact['requester_uid']
        
        other_user = db.users.find_one(
            {"firebase_uid": other_uid},
            {"_id": 0, "firebase_uid": 1, "display_name": 1, "avatar_url": 1, "status_message": 1, "last_seen": 1}
        )
        
        if other_user:
            enriched_contacts.append({
                "contact_id": str(contact['_id']),
                "status": contact['status'],
                "requester_uid": contact['requester_uid'],
                "addressee_uid": contact['addressee_uid'],
                "other_user": other_user,
                "created_at": contact.get('created_at').isoformat() if isinstance(contact.get('created_at'), datetime) else contact.get('created_at'),
                "updated_at": contact.get('updated_at').isoformat() if isinstance(contact.get('updated_at'), datetime) else contact.get('updated_at')
            })
            
    return jsonify(enriched_contacts), 200

@contacts_bp.route('/request', methods=['POST'])
@require_auth
def send_contact_request():
    uid = get_current_uid()
    db = get_db()
    
    data = request.json
    addressee_uid = data.get('addressee_uid')
    
    if not addressee_uid or not isinstance(addressee_uid, str):
        return jsonify({"error": "addressee_uid is required"}), 400
        
    if addressee_uid == uid:
        return jsonify({"error": "Cannot add yourself"}), 400
        
    # Check if addressee exists
    addressee = db.users.find_one({"firebase_uid": addressee_uid})
    if not addressee:
        return jsonify({"error": "User not found"}), 404
        
    # Check for existing relationship
    existing = db.contacts.find_one({
        "$or": [
            {"requester_uid": uid, "addressee_uid": addressee_uid},
            {"requester_uid": addressee_uid, "addressee_uid": uid}
        ]
    })
    
    if existing:
        status = existing.get('status')
        if status == "accepted":
            return jsonify({"error": "Already contacts"}), 409
        if status == "pending":
            return jsonify({"error": "Request already pending"}), 409
        if status == "blocked":
            return jsonify({"error": "Cannot send request"}), 403
            
    new_contact = {
        "requester_uid": uid,
        "addressee_uid": addressee_uid,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = db.contacts.insert_one(new_contact)
    inserted_id = result.inserted_id
    new_contact['_id'] = str(inserted_id)
    
    # Get requester profile for notification
    requester = db.users.find_one({"firebase_uid": uid}, {"_id": 0, "firebase_uid": 1, "display_name": 1, "avatar_url": 1})
    
    # Emit socket event to the addressee
    socketio.emit(
        "user:contact_request",
        {
            "from_uid": uid,
            "contact_id": str(inserted_id),
            "from_user": requester
        },
        room=addressee_uid
    )
    
    # Convert datetime to ISO string for JSON serialization
    new_contact['created_at'] = new_contact['created_at'].isoformat()
    new_contact['updated_at'] = new_contact['updated_at'].isoformat()
    
    return jsonify(new_contact), 201

@contacts_bp.route('/<id>', methods=['PUT'])
@require_auth
def update_contact(id):
    uid = get_current_uid()
    db = get_db()
    
    try:
        contact_id = ObjectId(id)
    except Exception:
        return jsonify({"error": "Invalid contact ID"}), 400
        
    data = request.json
    new_status = data.get('status')
    if new_status not in ['accepted', 'blocked']:
        return jsonify({"error": "Invalid status"}), 400
        
    contact = db.contacts.find_one({"_id": contact_id})
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
        
    if new_status == 'accepted':
        if contact['addressee_uid'] != uid:
            return jsonify({"error": "Only the recipient can accept a request"}), 403
        if contact['status'] != 'pending':
            return jsonify({"error": "Request is not pending"}), 409
    elif new_status == 'blocked':
        if contact['requester_uid'] != uid and contact['addressee_uid'] != uid:
            return jsonify({"error": "Unauthorized"}), 403
            
    db.contacts.update_one(
        {"_id": contact_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )
    
    # Return enriched contact
    updated_contact = db.contacts.find_one({"_id": contact_id})
    other_uid = updated_contact['addressee_uid'] if updated_contact['requester_uid'] == uid else updated_contact['requester_uid']
    other_user = db.users.find_one(
        {"firebase_uid": other_uid},
        {"_id": 0, "firebase_uid": 1, "display_name": 1, "avatar_url": 1, "status_message": 1, "last_seen": 1}
    )
    
    return jsonify({
        "contact_id": str(updated_contact['_id']),
        "status": updated_contact['status'],
        "other_user": other_user
    }), 200

@contacts_bp.route('/<id>', methods=['DELETE'])
@require_auth
def delete_contact(id):
    uid = get_current_uid()
    db = get_db()
    
    try:
        contact_id = ObjectId(id)
    except Exception:
        return jsonify({"error": "Invalid contact ID"}), 400
        
    contact = db.contacts.find_one({"_id": contact_id})
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
        
    if contact['requester_uid'] != uid and contact['addressee_uid'] != uid:
        return jsonify({"error": "Unauthorized"}), 403
        
    db.contacts.delete_one({"_id": contact_id})
    return jsonify({"message": "Contact removed"}), 200
