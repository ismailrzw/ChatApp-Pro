import magic

def allowed_image_mimetype(file_bytes) -> bool:
    """Check if the MIME type of file_bytes is JPEG or PNG using python-magic."""
    mime = magic.Magic(mime=True)
    mimetype = mime.from_buffer(file_bytes)
    return mimetype in ['image/jpeg', 'image/png']
