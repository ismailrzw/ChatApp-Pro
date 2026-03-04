import pytest
from io import BytesIO

def test_get_me_success(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.get('/api/users/me', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data['display_name'] == "Alice"
    assert data['email'] == "alice@test.com"
    assert '_id' not in data

def test_get_me_unauthenticated(client):
    response = client.get('/api/users/me')
    assert response.status_code == 401

def test_update_me_display_name(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.put('/api/users/me', headers=headers, json={"display_name": "Alice Updated"})
    assert response.status_code == 200
    data = response.get_json()
    assert data['display_name'] == "Alice Updated"
    
    # Verify in DB
    user = seeded_users.users.find_one({"firebase_uid": "uid-alice"})
    assert user['display_name'] == "Alice Updated"

def test_update_me_status_message(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.put('/api/users/me', headers=headers, json={"status_message": "Feeling good"})
    assert response.status_code == 200
    data = response.get_json()
    assert data['status_message'] == "Feeling good"

def test_update_me_validation_error(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    # Empty display_name
    response = client.put('/api/users/me', headers=headers, json={"display_name": ""})
    assert response.status_code == 400
    assert "Validation failed" in response.get_json()['error']

def test_update_me_ignores_role(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.put('/api/users/me', headers=headers, json={"role": "admin"})
    assert response.status_code == 200
    
    # Verify in DB
    user = seeded_users.users.find_one({"firebase_uid": "uid-alice"})
    assert user['role'] == "user"

def test_update_me_ignores_is_banned(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.put('/api/users/me', headers=headers, json={"is_banned": True})
    assert response.status_code == 200
    
    # Verify in DB
    user = seeded_users.users.find_one({"firebase_uid": "uid-alice"})
    assert user['is_banned'] is False

def test_search_returns_matches(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.get('/api/users/search?q=bob', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]['display_name'] == "Bob"

def test_search_excludes_self(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.get('/api/users/search?q=alice', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 0

def test_search_excludes_banned(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    seeded_users.users.update_one({"firebase_uid": "uid-bob"}, {"$set": {"is_banned": True}})
    
    response = client.get('/api/users/search?q=bob', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 0

def test_search_short_query_returns_empty(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    response = client.get('/api/users/search?q=b', headers=headers)
    assert response.status_code == 200
    assert response.get_json() == []

def test_avatar_upload_success(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    # Create a dummy JPEG
    img_data = b'\xff\xd8\xff\xdb' + b'0' * 100 # Minimal JPEG header-ish
    data = {
        'file': (BytesIO(img_data), 'test.jpg')
    }
    
    # Mock allowed_image_mimetype to return True
    with patch("blueprints.users.allowed_image_mimetype", return_value=True):
        response = client.post('/api/users/me/avatar', headers=headers, data=data, content_type='multipart/form-data')
        assert response.status_code == 200
        assert 'avatar_url' in response.get_json()
        
        # Verify in DB
        user = seeded_users.users.find_one({"firebase_uid": "uid-alice"})
        assert user['avatar_url'].startswith("/api/media/avatars/uid-alice/")

def test_avatar_upload_too_large(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    # 3MB file
    img_data = b'0' * (3 * 1024 * 1024)
    data = {
        'file': (BytesIO(img_data), 'large.jpg')
    }
    
    response = client.post('/api/users/me/avatar', headers=headers, data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    assert "exceeds 2MB" in response.get_json()['error']

def test_avatar_upload_wrong_mime(client, seeded_users, mock_firebase_verify):
    mock_firebase_verify.return_value = {"uid": "uid-alice"}
    headers = {"Authorization": "Bearer valid-token"}
    
    data = {
        'file': (BytesIO(b'some text'), 'test.txt')
    }
    
    # Mock allowed_image_mimetype to return False
    with patch("blueprints.users.allowed_image_mimetype", return_value=False):
        response = client.post('/api/users/me/avatar', headers=headers, data=data, content_type='multipart/form-data')
        assert response.status_code == 400
        assert "Invalid file type" in response.get_json()['error']

from unittest.mock import patch
