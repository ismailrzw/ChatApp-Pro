from flask_socketio import emit
from flask import request

def register_socket_events(socketio):
    @socketio.on("connect")
    def handle_connect():
        print(f"[Socket] Client connected: {request.sid}")

    @socketio.on("disconnect")
    def handle_disconnect():
        print(f"[Socket] Client disconnected: {request.sid}")
        
    @socketio.on("ping_server")
    def handle_ping():
        emit("pong_client", {"data": "connected"})
