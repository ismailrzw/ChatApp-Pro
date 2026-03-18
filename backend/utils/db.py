"""
MongoDB connection manager.

CRITICAL RULES for eventlet compatibility:
1. Never close the MongoClient — closing it kills the connection pool and
   eventlet cannot re-establish it. The client lives for the entire process.
2. Never ping on every get_db() call — it adds latency and fails after close.
3. The teardown_appcontext hook must NOT call close_db().
"""
import os
import pymongo

_db_client = None
_db = None


def get_db():
    global _db_client, _db

    if _db_client is not None and _db is not None:
        return _db

    mongo_uri = os.environ.get(
        "MONGO_URI",
        "mongodb://localhost:27017/chat_db"
    )

    # Parse database name from URI
    # Atlas URI: mongodb+srv://user:pass@cluster.mongodb.net/chat_db
    # Local URI:  mongodb://localhost:27017/chat_db
    uri_path = mongo_uri.rstrip("/").split("/")[-1]
    db_name = uri_path.split("?")[0] or "chat_db"

    try:
        _db_client = pymongo.MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=30000,
        )
        _db = _db_client[db_name]
    except Exception as e:
        _db_client = None
        _db = None
        raise RuntimeError(f"Could not connect to MongoDB: {e}")

    return _db


def close_db():
    """
    No-op — intentionally does NOT close the connection.
    Closing MongoClient with eventlet causes InvalidOperation errors
    on subsequent requests. The OS reclaims connections on process exit.
    """
    pass