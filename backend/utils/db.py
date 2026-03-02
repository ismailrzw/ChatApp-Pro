import os
import pymongo
from flask import current_app

_db_client = None

def get_db():
    global _db_client
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/chat_db")
    
    if _db_client is None:
        try:
            _db_client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            # The ping command is cheap and does not require auth.
            _db_client.admin.command('ping')
        except Exception as e:
            _db_client = None
            raise RuntimeError(f"Could not connect to MongoDB: {e}")
            
    # Extract database name from URI or use default
    # Example URI: mongodb://localhost:27017/chatnow
    db_name = mongo_uri.split("/")[-1] or "chat_db"
    return _db_client[db_name]

def close_db():
    global _db_client
    if _db_client is not None:
        _db_client.close()
        _db_client = None
