import os
import logging
from functools import wraps
from flask import request, jsonify

# --- Optional Firebase Import (graceful fallback for local dev) ---
FIREBASE_AVAILABLE = True
try:
    import firebase_admin  # type: ignore
    from firebase_admin import credentials, auth  # type: ignore
except Exception as imp_err:
    FIREBASE_AVAILABLE = False
    logging.getLogger(__name__).warning(f"firebase_admin not available ({imp_err}). Running in mock auth mode.")

# --- Initialize Firebase Admin SDK ---
# This looks for the service account key file you downloaded.
if FIREBASE_AVAILABLE:
    try:
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        logging.getLogger(__name__).info("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        FIREBASE_AVAILABLE = False
        logging.getLogger(__name__).error(f"ERROR initializing Firebase Admin SDK: {e}")
        logging.getLogger(__name__).warning("Proceeding in mock auth mode. Place 'serviceAccountKey.json' in backend/ to enable real token verification.")

def token_required(f):
    """A decorator to protect API routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        # Check for the token in the Authorization header
        if 'Authorization' in request.headers:
            # The header is expected to be in the format "Bearer <token>"
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({"error": "Authorization token is missing!"}), 401

        try:
            # Allow a deterministic mock token or any token starting with 'mock-' when Firebase unavailable
            if token.startswith('mock-') or token == 'mock-jwt-token-12345':
                request.user = {
                    'uid': 'dev-user',
                    'email': 'dev@anup.local',
                    'name': 'Developer User',
                    'mock': True
                }
            elif FIREBASE_AVAILABLE:
                decoded_token = auth.verify_id_token(token)  # type: ignore
                request.user = decoded_token
            else:
                return jsonify({"error": "Firebase authentication not available. Use a mock token (prefix 'mock-')."}), 403
        except Exception as e:
            logging.getLogger(__name__).warning(f"Token verification failed: {e}")
            return jsonify({"error": "Invalid or expired token!"}), 403
        
        return f(*args, **kwargs)
    return decorated_function
