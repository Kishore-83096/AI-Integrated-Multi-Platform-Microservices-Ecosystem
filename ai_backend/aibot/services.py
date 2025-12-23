# ======================================================
# aibot/services.py
# Authentication, Intent Detection, and Profile Logic
# ======================================================

import os
import time
import re
import logging
from functools import wraps

import requests

# Assuming aibot/ai_model.py exists with these functions/constants
from .ai_model import generate_ai_response, AVAILABLE_MODELS 


# ======================================================
# LOGGING & HTTP SESSION
# ======================================================

logger = logging.getLogger("aibot.services")

HTTP_SESSION = requests.Session()
HTTP_SESSION.headers.update({"Content-Type": "application/json"})

# ======================================================
# TOKEN CACHE
# ======================================================

TOKEN_CACHE = {}
TOKEN_CACHE_TTL = 60  # seconds


class TokenValidationError(Exception):
    pass


# ======================================================
# TOKEN VALIDATION
# ======================================================

def validate_bearer_token(auth_header: str):
    """Validates the token against the external auth service (with caching)."""
    if not auth_header or not auth_header.startswith("Bearer "):
        raise TokenValidationError("Authorization header missing")

    token = auth_header.split(" ")[1]

    # Check cache
    cached = TOKEN_CACHE.get(token)
    if cached and time.time() - cached[1] < TOKEN_CACHE_TTL:
        return token, cached[0]

    # Call Auth Service
    try:
        response = HTTP_SESSION.get(
            os.getenv("AUTH_SERVICE_URL", "http://localhost:8000/api/auth/profile/"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=3,
        )
    except requests.RequestException:
        logger.warning("AUTH_SERVICE_URL is unreachable or timed out.")
        raise TokenValidationError("Auth service unreachable") from None


    if response.status_code != 200:
        raise TokenValidationError("Invalid token")

    user_data = response.json()
    # Update cache
    TOKEN_CACHE[token] = (user_data, time.time())
    return token, user_data


# ======================================================
# AUTH DECORATORS
# ======================================================

def optional_bearer_token(view_func):
    """Adds `is_authenticated`, `user_data`, and `token` to the request object."""
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        request.is_authenticated = False
        request.user_data = None
        request.token = None

        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if auth.startswith("Bearer "):
            try:
                token, user_data = validate_bearer_token(auth)
                request.is_authenticated = True
                request.user_data = user_data
                request.token = token
            except TokenValidationError:
                pass

        return view_func(self, request, *args, **kwargs)
    return wrapper


def require_bearer_token(view_func):
    """Validates the token and halts if invalid (returns 401 response)."""
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        try:
            token, user_data = validate_bearer_token(
                request.META.get("HTTP_AUTHORIZATION", "")
            )
            request.is_authenticated = True
            request.user_data = user_data
            request.token = token
            return view_func(self, request, *args, **kwargs)
        except TokenValidationError as e:
            from rest_framework.response import Response
            from rest_framework import status
            return Response(
                {"detail": str(e)}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
    return wrapper


# ======================================================
# PROFILE FIELD DEFINITIONS (Constants)
# ======================================================

QUESTION_WORDS = {
    "is", "are", "can", "could", "will", "would",
    "how", "what", "why", "when", "where"
}


PROFILE_FIELDS = {
    "full_name": {
        "label": "name",
        "example": "Update my name to John Doe",
        "success": "✅ Your name has been updated successfully.",
        "failure": "❌ Failed to update your name.",
    },
    "bio": {
        "label": "bio",
        "example": "Update my bio to Django developer",
        "success": "✅ Your bio has been updated successfully.",
        "failure": "❌ Failed to update your bio.",
    },
    "phone_number": {
        "label": "phone number",
        "example": "Change my phone number to 9876543210",
        "success": "✅ Your phone number has been updated successfully.",
        "failure": "❌ Failed to update your phone number.",
    },
    "gender": {
        "label": "gender",
        "example": "Set my gender to M",
        "success": "✅ Your gender has been updated successfully.",
        "failure": "❌ Failed to update your gender.",
    },
    "date_of_birth": {
        "label": "date of birth",
        "example": "Update my dob to 2000-05-14",
        "success": "✅ Your date of birth has been updated successfully.",
        "failure": "❌ Failed to update your date of birth.",
    },
}

PROFILE_FIELD_MAP = {
    "name": "full_name",
    "full name": "full_name",
    "fullname": "full_name",

    "bio": "bio",
    "about": "bio",
    "about me": "bio",

    "phone": "phone_number",
    "phone number": "phone_number",
    "number": "phone_number",

    "gender": "gender",

    "dob": "date_of_birth",
    "date of birth": "date_of_birth",
    "birthdate": "date_of_birth",
}

ACTION_VERBS = {"update", "change", "set", "modify"}


# ======================================================
# PROFILE HELPERS
# ======================================================
def build_examples(field=None):
    """Builds a formatted string of profile update examples."""
    if field and field in PROFILE_FIELDS:
        return f"- {PROFILE_FIELDS[field]['example']}"
    return "\n".join(f"- {cfg['example']}" for cfg in PROFILE_FIELDS.values())


def validate_field_value(field, value):
    """Performs simple regex/value validation for profile fields."""
    if field == "phone_number":
        if not re.fullmatch(r"\d{10}", value):
            return "Phone number must be exactly 10 digits."

    if field == "gender":
        if value.upper() not in {"M", "F", "O"}:
            return "Gender must be M, F, or O."

    if field == "date_of_birth":
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return "Date of birth must be in YYYY-MM-DD format."

    return None


# ======================================================
# INTENT DETECTION
# ======================================================
def detect_intent(message: str):
    """Determines if the message is a chat or a profile update command."""
    msg = message.lower().strip()
    words = set(msg.split())

    is_question = (
        "?" in msg or
        words.intersection(QUESTION_WORDS)
    )

    has_action = any(v in msg for v in ACTION_VERBS)
    has_field = any(k in msg for k in PROFILE_FIELD_MAP)

    # If it's a question, treat as CHAT unless it explicitly starts with an action verb
    if is_question and not msg.startswith(tuple(ACTION_VERBS)):
        return {"intent": "CHAT"}

    if has_field and not has_action:
        return {
            "intent": "POSSIBLE_PROFILE_UPDATE",
            "reason": "Action verb missing (update / change / set)"
        }

    if has_action:
        to_index = msg.find(" to ")
        if to_index == -1:
            return {
                "intent": "INCOMPLETE_ACTION",
                "reason": "Missing 'to <value>' part"
            }

        value = message[to_index + 4:].strip()
        if not value:
            return {
                "intent": "INCOMPLETE_ACTION",
                "reason": "Value after 'to' is missing"
            }

        for keyword, field in PROFILE_FIELD_MAP.items():
            if keyword in msg:
                return {
                    "intent": "UPDATE_PROFILE",
                    "data": {
                        "field": field,
                        "value": value
                    }
                }

        return {
            "intent": "POSSIBLE_PROFILE_UPDATE",
            "reason": "Unknown profile field"
        }

    return {"intent": "CHAT"}


# ======================================================
# PROFILE UPDATE EXECUTION
# ======================================================
def execute_update_profile(request, field: str, value: str):
    """Calls the external authentication service to update a profile field."""
    if not request.is_authenticated:
        return {"error": "You must be logged in to update your profile."}

    payload = {field: value}

    try:
        response = HTTP_SESSION.put(
            os.getenv(
                "AUTH_PROFILE_UPDATE_URL",
                "http://localhost:8000/api/auth/profile/update/"
            ),
            json=payload,
            headers={"Authorization": f"Bearer {request.token}"},
            timeout=5,
        )
    except requests.RequestException:
        logger.exception("Profile update request failed")
        return {"error": "Profile service is unreachable."}

    if response.status_code != 200:
        return {"error": response.text or "Profile update failed."}

    return {"success": True}