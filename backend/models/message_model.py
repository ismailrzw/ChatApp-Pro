"""Marshmallow schemas for message serialization."""
from marshmallow import Schema, fields, EXCLUDE


class MessageResponseSchema(Schema):
    """Serializes a message document for API responses."""

    class Meta:
        unknown = EXCLUDE

    id = fields.Method("get_id", dump_only=True)
    conversation_id = fields.Str(dump_only=True)
    sender_uid = fields.Str(dump_only=True)
    type = fields.Str(dump_only=True)
    content = fields.Str(dump_only=True)
    media_url = fields.Str(dump_only=True, allow_none=True)
    reply_to_id = fields.Str(dump_only=True, allow_none=True)
    status = fields.Str(dump_only=True)
    read_by = fields.List(fields.Dict(), dump_only=True)
    is_deleted_for_all = fields.Bool(dump_only=True)
    deleted_for = fields.List(fields.Str(), dump_only=True)
    created_at = fields.DateTime(dump_only=True)

    def get_id(self, obj):
        """Return _id as string; obj may have 'id' already converted."""
        raw = obj.get("id") or obj.get("_id")
        return str(raw) if raw else ""