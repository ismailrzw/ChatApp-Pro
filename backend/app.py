import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_cors import CORS
from config import DevelopmentConfig
from extensions import socketio


def create_app(config_class=DevelopmentConfig):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode="eventlet",
        logger=False,
        engineio_logger=False,
    )

    from blueprints.auth import auth_bp
    from blueprints.users import users_bp
    from blueprints.contacts import contacts_bp
    from blueprints.conversations import conversations_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(contacts_bp)
    app.register_blueprint(conversations_bp)

    from sockets import events  # noqa: F401

    # DO NOT register teardown_appcontext to call close_db.
    # Closing MongoClient after every request causes
    # "Cannot use MongoClient after close" errors with eventlet.

    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)