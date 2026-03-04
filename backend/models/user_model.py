from marshmallow import Schema, fields, validate, EXCLUDE

class UpdateProfileSchema(Schema):
    class Meta:
        unknown = EXCLUDE   # ignore extra fields silently

    display_name   = fields.Str(validate=validate.Length(min=1, max=50))
    status_message = fields.Str(validate=validate.Length(max=120))

class UserSearchResultSchema(Schema):
    firebase_uid  = fields.Str(dump_only=True)
    display_name  = fields.Str(dump_only=True)
    email         = fields.Str(dump_only=True)
    avatar_url    = fields.Str(dump_only=True, allow_none=True)
    status_message = fields.Str(dump_only=True)
