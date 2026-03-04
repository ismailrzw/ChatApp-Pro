import pytest
import mongomock
from unittest.mock import patch, MagicMock
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import create_app

@pytest.fixture
def app():
    # Patch MongoClient before creating the app
    with patch("utils.db.pymongo.MongoClient", mongomock.MongoClient):
        from utils.db import _db_client
        # Ensure we start fresh
        import utils.db
        utils.db._db_client = None
        
        app = create_app("testing")
        app.config["TESTING"] = True
        yield app
        
        # Cleanup after test
        utils.db._db_client = None

@pytest.fixture(autouse=True)
def clean_db(app):
    from utils.db import get_db
    db = get_db()
    for collection in db.list_collection_names():
        db[collection].delete_many({})

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def mock_firebase_verify():
    with patch("services.auth_service.firebase_auth.verify_id_token") as mock:
        mock.return_value = {
            "uid": "test-uid-123",
            "email": "test@example.com",
        }
        yield mock

@pytest.fixture
def mock_firebase_invalid():
    with patch("services.auth_service.firebase_auth.verify_id_token") as mock:
        mock.side_effect = Exception("Token invalid")
        yield mock

@pytest.fixture
def seeded_users(app):
    """Insert two test users into the mock DB before the test."""
    with app.app_context():
        from utils.db import get_db
        db = get_db()
        db.users.insert_many([
            {
                "firebase_uid": "uid-alice", "email": "alice@test.com",
                "display_name": "Alice", "avatar_url": None,
                "status_message": "", "role": "user",
                "is_banned": False, "last_seen": None,
                "visibility": {"last_seen": "everyone"},
                "created_at": None
            },
            {
                "firebase_uid": "uid-bob", "email": "bob@test.com",
                "display_name": "Bob", "avatar_url": None,
                "status_message": "", "role": "user",
                "is_banned": False, "last_seen": None,
                "visibility": {"last_seen": "everyone"},
                "created_at": None
            }
        ])
        yield db
        db.users.delete_many({})
        db.contacts.delete_many({})
