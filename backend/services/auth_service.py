import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import os

_app = None

def _get_firebase_app():
    global _app
    if _app is None:
        service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "../firebase-service-account.json")
        try:
            cred = credentials.Certificate(service_account_path)
            _app = firebase_admin.initialize_app(cred)
        except Exception as e:
            # Handle potential initialization issues (e.g. app already exists)
            try:
                _app = firebase_admin.get_app()
            except ValueError:
                raise RuntimeError(f"Failed to initialize Firebase Admin SDK: {e}")
    return _app

def verify_token(id_token: str) -> dict:
    _get_firebase_app()
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        raise ValueError("Invalid or expired token")

def get_user(uid: str) -> dict:
    _get_firebase_app()
    try:
        user = firebase_auth.get_user(uid)
        return {
            "uid": user.uid,
            "email": user.email,
            "display_name": user.display_name,
            "photo_url": user.photo_url
        }
    except Exception as e:
        raise ValueError(f"Error fetching user: {e}")

# Trigger initialization on import
_get_firebase_app()
