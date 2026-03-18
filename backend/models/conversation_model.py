"""Marshmallow schemas for conversation validation and serialization."""
from marshmallow import Schema, fields, validate, EXCLUDE


class CreateConversationSchema(Schema):
    """Validates POST /api/conversations request body."""

    class Meta:
        unknown = EXCLUDE

    type = fields.Str(
        required=True,
        validate=validate.OneOf(["direct", "group"]),
    )
    participant_uid = fields.Str(load_default=None)
    group_name = fields.Str(
        load_default=None,
        validate=validate.Length(min=1, max=80),
    )
    participant_uids = fields.List(fields.Str(), load_default=None)


class ConversationResponseSchema(Schema):
    """Serializes a conversation document for API responses."""

    id = fields.Method("get_id", dump_only=True)
    type = fields.Str(dump_only=True)
    participants = fields.List(fields.Str(), dump_only=True)
    group_name = fields.Str(dump_only=True, allow_none=True)
    group_avatar = fields.Str(dump_only=True, allow_none=True)
    last_message = fields.Dict(dump_only=True, allow_none=True)
    other_user = fields.Dict(dump_only=True, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    def get_id(self, obj):
        """Return _id as string; obj may have 'id' already converted."""
        raw = obj.get("id") or obj.get("_id")
        return str(raw) if raw else ""