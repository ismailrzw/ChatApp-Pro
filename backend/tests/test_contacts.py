import pytest
from bson import ObjectId

def test_get_contacts_empty(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.get('/api/contacts', headers=headers)
    assert response.status_code == 200
    assert response.get_json() == []

def test_get_contacts_returns_accepted_only(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    # Add one accepted and one pending contact
    seeded_users.contacts.insert_one({
        "requester_uid": "uid-alice",
        "addressee_uid": "uid-bob",
        "status": "accepted"
    })
    seeded_users.contacts.insert_one({
        "requester_uid": "uid-alice",
        "addressee_uid": "other-user",
        "status": "pending"
    })
    
    response = client.get('/api/contacts', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]['other_user']['display_name'] == "Bob"
    assert data[0]['status'] == "accepted"

def test_send_request_success(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    # Patch socketio.emit to avoid issues
    with patch("blueprints.contacts.socketio.emit") as mock_emit:
        response = client.post('/api/contacts/request', headers=headers, json={"addressee_uid": "uid-bob"})
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == "pending"
        assert data['addressee_uid'] == "uid-bob"
        
        # Verify in DB
        contact = seeded_users.contacts.find_one({"requester_uid": "uid-alice", "addressee_uid": "uid-bob"})
        assert contact is not None
        assert contact['status'] == "pending"
        
        mock_emit.assert_called_once()

def test_send_request_to_self(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.post('/api/contacts/request', headers=headers, json={"addressee_uid": "uid-alice"})
    assert response.status_code == 400
    assert "Cannot add yourself" in response.get_json()['error']

def test_send_request_user_not_found(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.post('/api/contacts/request', headers=headers, json={"addressee_uid": "non-existent"})
    assert response.status_code == 404

def test_send_request_duplicate(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    seeded_users.contacts.insert_one({
        "requester_uid": "uid-alice",
        "addressee_uid": "uid-bob",
        "status": "pending"
    })
    
    response = client.post('/api/contacts/request', headers=headers, json={"addressee_uid": "uid-bob"})
    assert response.status_code == 409
    assert "Request already pending" in response.get_json()['error']

def test_send_request_blocked(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    seeded_users.contacts.insert_one({
        "requester_uid": "uid-bob",
        "addressee_uid": "uid-alice",
        "status": "blocked"
    })
    
    response = client.post('/api/contacts/request', headers=headers, json={"addressee_uid": "uid-bob"})
    assert response.status_code == 403

def test_accept_request_as_addressee(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-bob"}
    headers = {"Authorization": "Bearer valid-token"}
    
    result = seeded_users.contacts.insert_one({
        "requester_uid": "uid-alice",
        "addressee_uid": "uid-bob",
        "status": "pending"
    })
    contact_id = str(result.inserted_id)
    
    response = client.put(f'/api/contacts/{contact_id}', headers=headers, json={"status": "accepted"})
    assert response.status_code == 200
    assert response.get_json()['status'] == "accepted"
    
    # Verify in DB
    contact = seeded_users.contacts.find_one({"_id": ObjectId(contact_id)})
    assert contact['status'] == "accepted"

def test_accept_request_as_requester_forbidden(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    result = seeded_users.contacts.insert_one({
        "requester_uid": "uid-alice",
        "addressee_uid": "uid-bob",
        "status": "pending"
    })
    contact_id = str(result.inserted_id)
    
    response = client.put(f'/api/contacts/{contact_id}', headers=headers, json={"status": "accepted"})
    assert response.status_code == 403

def test_block_contact(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    result = seeded_users.contacts.insert_one({
        "requester_uid": "uid-alice",
        "addressee_uid": "uid-bob",
        "status": "accepted"
    })
    contact_id = str(result.inserted_id)
    
    response = client.put(f'/api/contacts/{contact_id}', headers=headers, json={"status": "blocked"})
    assert response.status_code == 200
    assert response.get_json()['status'] == "blocked"

def test_update_contact_invalid_id(client, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.put('/api/contacts/invalid-id', headers=headers, json={"status": "accepted"})
    assert response.status_code == 400

def test_delete_contact_success(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    result = seeded_users.contacts.insert_one({
        "requester_uid": "uid-alice",
        "addressee_uid": "uid-bob",
        "status": "accepted"
    })
    contact_id = str(result.inserted_id)
    
    response = client.delete(f'/api/contacts/{contact_id}', headers=headers)
    assert response.status_code == 200
    assert "Contact removed" in response.get_json()['message']
    
    # Verify in DB
    contact = seeded_users.contacts.find_one({"_id": ObjectId(contact_id)})
    assert contact is None

def test_delete_contact_not_owner(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "other-user"}
    headers = {"Authorization": "Bearer valid-token"}
    
    result = seeded_users.contacts.insert_one({
        "requester_uid": "uid-alice",
        "addressee_uid": "uid-bob",
        "status": "accepted"
    })
    contact_id = str(result.inserted_id)
    
    response = client.delete(f'/api/contacts/{contact_id}', headers=headers)
    assert response.status_code == 403

from unittest.mock import patch
