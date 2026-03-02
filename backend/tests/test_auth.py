import pytest
from utils.db import get_db

def test_health_endpoint(client):
    """T1: GET /api/health → 200, body has status: ok"""
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'ok'
    assert 'timestamp' in data

def test_verify_no_header(client):
    """T2: POST /api/auth/verify with no header → 401"""
    response = client.post('/api/auth/verify')
    assert response.status_code == 401
    assert response.get_json()['error'] == "Missing authorization header"

def test_verify_bad_token(client, mock_firebase_invalid):
    """T3: POST /api/auth/verify with invalid token → 401"""
    response = client.post('/api/auth/verify', headers={"Authorization": "Bearer garbage"})
    assert response.status_code == 401
    assert response.get_json()['error'] == "Invalid or expired token"

def test_verify_valid_token_creates_user(client, mock_firebase_verify):
    """T4: POST /api/auth/verify with valid token → 200, user doc in mock DB"""
    response = client.post('/api/auth/verify', headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    data = response.get_json()
    assert data['firebase_uid'] == "test-uid-123"
    assert data['email'] == "test@example.com"
    
    # Check DB
    db = get_db()
    user = db.users.find_one({"firebase_uid": "test-uid-123"})
    assert user is not None
    assert user['email'] == "test@example.com"

def test_verify_valid_token_no_id_field(client, mock_firebase_verify):
    """T5: Response must not contain _id"""
    response = client.post('/api/auth/verify', headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    data = response.get_json()
    assert '_id' not in data

def test_verify_idempotent_upsert(client, mock_firebase_verify):
    """T6: Call verify twice with same UID → only one user doc exists in DB"""
    client.post('/api/auth/verify', headers={"Authorization": "Bearer valid-token"})
    client.post('/api/auth/verify', headers={"Authorization": "Bearer valid-token"})
    
    db = get_db()
    users_count = db.users.count_documents({"firebase_uid": "test-uid-123"})
    assert users_count == 1

def test_verify_banned_user(client, mock_firebase_verify):
    """T7: Pre-insert banned user → POST /api/auth/verify → 403"""
    db = get_db()
    db.users.insert_one({
        "firebase_uid": "test-uid-123",
        "email": "test@example.com",
        "is_banned": True
    })
    
    response = client.post('/api/auth/verify', headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 403
    assert response.get_json()['error'] == "Account suspended"

def test_require_auth_missing_bearer_prefix(client):
    """T8: Header Authorization: NotBearer token → 401"""
    response = client.post('/api/auth/verify', headers={"Authorization": "NotBearer some-token"})
    assert response.status_code == 401
    assert response.get_json()['error'] == "Missing authorization header"
