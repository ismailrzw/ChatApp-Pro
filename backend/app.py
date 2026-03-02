from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from datetime import datetime
import os

from config import config
from blueprints.auth import auth_bp
from blueprints.users import users_bp
from blueprints.conversations import conversations_bp
from blueprints.messages import messages_bp
from blueprints.media import media_bp
from blueprints.admin import admin_bp
from sockets.events import register_socket_events

socketio = SocketIO()

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize CORS
    CORS(app, resources={r"/api/*": {"origins": app.config['ALLOWED_ORIGINS']}})
    
    # Initialize SocketIO
    socketio.init_app(
        app, 
        cors_allowed_origins=app.config['ALLOWED_ORIGINS'],
        async_mode="threading" # As per B7 spec
    )
    
    # Register Socket Events
    register_socket_events(socketio)
    
    # Register Health Route
    @app.route('/api/health')
    def health_check():
        return jsonify({
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 200
    
    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(conversations_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(media_bp)
    app.register_blueprint(admin_bp)
    
    return app

if __name__ == '__main__':
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    socketio.run(app, host='0.0.0.0', port=5000, debug=app.config['DEBUG'])
