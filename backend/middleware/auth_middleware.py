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
            decoded_token = verify_token(token)
            g.current_user = decoded_token
        except ValueError as e:
            return jsonify({"error": str(e)}), 401
        except Exception as e:
            return jsonify({"error": "Authentication failed"}), 401
            
        return f(*args, **kwargs)
    return decorated_function

def get_current_uid() -> str:
    if hasattr(g, 'current_user') and g.current_user:
        return g.current_user.get('uid')
    return None
