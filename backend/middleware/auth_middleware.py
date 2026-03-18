from functools import wraps
from flask import request, jsonify, g
from services.auth_service import verify_token


def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing authorization header"}), 401

        token = auth_header.split(' ')[1]
        try:
            # verify_token returns the decoded token dict from Firebase Admin SDK
            decoded_token = verify_token(token)
            # Store on Flask's request context — accessible anywhere in the request
            g.current_user = decoded_token
            g.current_uid = decoded_token.get('uid') or decoded_token.get('user_id', '')
        except ValueError as e:
            return jsonify({"error": str(e)}), 401
        except Exception:
            return jsonify({"error": "Authentication failed"}), 401

        return f(*args, **kwargs)
    return decorated_function


def get_current_uid() -> str:
    """Return the firebase_uid of the authenticated user for the current request."""
    return getattr(g, 'current_uid', '')