# ======================================================
# aibot/views.py
# API View Definitions (Django REST Framework)
# ======================================================

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# --- Local Imports ---
from .models import AIConversation 
from .services import (
    require_bearer_token,
    optional_bearer_token,
    detect_intent,
    build_examples,
    validate_field_value,
    execute_update_profile,
    PROFILE_FIELDS,
)
# Assuming aibot/ai_model.py exists with these functions/constants
from .ai_model import generate_ai_response, AVAILABLE_MODELS 


logger = logging.getLogger("aibot.views")

import time
from datetime import datetime



# ======================================================
# USER PROFILE VIEW (FAST: NO EXTRA NETWORK CALLS)
# ======================================================

class UserProfileView(APIView):
    """
    Returns authenticated user profile data using cached/validated token data.
    ZERO additional HTTP calls.
    """
    authentication_classes = []
    permission_classes = []

    @require_bearer_token
    def get(self, request):
        profile = request.user_data

        return Response({
            "full_name": profile.get("full_name", "Unknown"),
            "avatar": profile.get("avatar"),
            "username": profile.get("user", {}).get("username", "Unknown"),
            "email": profile.get("user", {}).get("email", "Unknown"),
            "user_id": profile.get("id")
        })

def format_duration(total_milliseconds):
    """
    Converts a total duration in milliseconds into a human-readable string
    using hours, minutes, and seconds.
    e.g., 19200000ms (19200s) -> "5 hr 20 min"
    """
    if total_milliseconds is None:
        return ""
        
    total_seconds = int(round(total_milliseconds / 1000))

    if total_seconds == 0:
        return "0 secs"
    
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    parts = []
    if hours > 0:
        parts.append(f"{hours} hr")
    if minutes > 0:
        parts.append(f"{minutes} min")
    
    # Only show seconds if they are non-zero AND if we haven't already included hours or minutes.
    # OR if total time is less than a minute.
    if seconds > 0 and (hours == 0 and minutes == 0):
        parts.append(f"{seconds} secs")
    elif seconds > 0 and (hours > 0 or minutes > 0):
        parts.append(f"{seconds} secs")
    elif total_seconds < 60 and seconds > 0:
        # Handles cases like 50 seconds -> "50 secs"
        return f"{total_seconds} secs"

    return " ".join(parts)


# ======================================================
# CHAT INTERACTION VIEW (INTERACTION-BASED STORAGE)
# ======================================================




class AIBotChatView(APIView):
    authentication_classes = []
    permission_classes = []

    @optional_bearer_token
    def post(self, request):
        message = request.data.get("message")
        chat_id = request.data.get("chat_id")

        # -------------------------------
        # CLIENT TIMESTAMP
        # -------------------------------
        user_timestamp_iso = request.data.get(
            "user_timestamp",
            datetime.now().isoformat()
        )

        if not message:
            return Response({"error": "Message is required"}, status=400)

        # -------------------------------
        # USER & MODEL SELECTION
        # -------------------------------
        if request.is_authenticated:
            user = request.user_data.get("user", {})
            username = user.get("username", "Unknown")
            user_id = request.user_data.get("id")
            default_model = "mistral"
        else:
            username = "Guest"
            user_id = None
            default_model = "tinyllama"

        requested_model = request.data.get("model_type")
        model_type = requested_model.lower() if requested_model else default_model

        if model_type not in AVAILABLE_MODELS or not request.is_authenticated:
            model_type = default_model

        # -------------------------------
        # INTENT DETECTION
        # -------------------------------
        start_time = time.time()

        intent_data = detect_intent(message)
        intent_name = intent_data.get("intent", "CHAT")

        ACTION_INTENTS = {
            "UPDATE_PROFILE",
            "INCOMPLETE_ACTION",
            "POSSIBLE_PROFILE_UPDATE",
        }

        intent_category = "action" if intent_name in ACTION_INTENTS else "chat"

        action_field = (
            intent_data.get("data", {}).get("field")
            if intent_category == "action"
            else None
        )

        # -------------------------------
        # INTENT HANDLING
        # -------------------------------
        if intent_name in {"INCOMPLETE_ACTION", "POSSIBLE_PROFILE_UPDATE"}:
            ai_response = (
                f"❌ {intent_data.get('reason', 'Invalid profile update request')}.\n\n"
                "✅ Correct sentence examples:\n\n"
                f"{build_examples()}"
            )

        elif intent_name == "UPDATE_PROFILE":
            field = action_field
            value = intent_data.get("data", {}).get("value")
            field_cfg = PROFILE_FIELDS.get(field)

            if not field_cfg:
                ai_response = (
                    "❌ This profile field cannot be updated.\n\n"
                    f"✅ Example:\n{build_examples()}"
                )
            else:
                validation_error = validate_field_value(field, value)
                if validation_error:
                    ai_response = (
                        f"❌ {validation_error}\n\n"
                        f"✅ Correct example:\n{build_examples(field)}"
                    )
                else:
                    result = execute_update_profile(request, field, value)
                    if "error" in result:
                        ai_response = (
                            f"{field_cfg['failure']}\n\n"
                            f"ℹ Reason: {result['error']}"
                        )
                    else:
                        ai_response = field_cfg["success"]

        else:
            ai_response = generate_ai_response(
                message=message,
                max_tokens=256,
                model_type=model_type,
            )

        # -------------------------------
        # TIMING
        # -------------------------------
        end_time = time.time()
        time_taken_ms = round((end_time - start_time) * 1000)
        time_taken_formatted = format_duration(time_taken_ms)
        ai_response_timestamp_iso = datetime.now().isoformat()

        # -------------------------------
        # BUILD INTERACTION OBJECT
        # -------------------------------
        interaction = {
            "schema_version": "v2",

            "intent": intent_category,          # "chat" | "action"
            "intent_type": intent_name,          # CHAT | UPDATE_PROFILE

            "user_message": message,
            "user_timestamp": user_timestamp_iso,

            "ai_response": ai_response,
            "ai_timestamp": ai_response_timestamp_iso,

            "model": model_type,
            "time_taken_ms": time_taken_ms,
            "time_taken_formatted": time_taken_formatted,

            "action_field": action_field,
            "status": (
                "failed"
                if intent_category == "action" and "❌" in ai_response
                else "success"
            ),
        }

        # -------------------------------
        # RESPONSE PAYLOAD
        # -------------------------------
        response_data = {
            "user": username,
            "ai_response": ai_response,
            "is_authenticated": request.is_authenticated,
            "model_type": model_type,
            "intent": intent_name,
            "intent_category": intent_category,
            "time_taken_ms": time_taken_ms,
            "time_taken_formatted": time_taken_formatted,
            "ai_response_timestamp": ai_response_timestamp_iso,
        }

        # -------------------------------
        # STORE CONVERSATION
        # -------------------------------
        if request.is_authenticated:
            try:
                convo = None

                if chat_id:
                    convo = AIConversation.objects.filter(
                        chat_id=chat_id,
                        user_id=user_id
                    ).first()

                if convo:
                    convo.conversation.append(interaction)
                    convo.save()
                else:
                    convo = AIConversation.objects.create(
                        user_id=user_id,
                        username=username,
                        is_authenticated=True,
                        conversation=[interaction],
                        ip_address=request.META.get("REMOTE_ADDR"),
                    )

                response_data["chat_id"] = convo.chat_id

            except Exception:
                logger.exception("Failed to save conversation")

        return Response(response_data)



# ======================================================
# CHAT SIDEBAR VIEW
# ======================================================
class AIBotChatSidebarView(APIView):
    authentication_classes = []
    permission_classes = []

    @require_bearer_token
    def get(self, request):
        user_id = request.user_data.get("id")

        conversations = (
            AIConversation.objects
            .filter(user_id=user_id)
            .order_by("-updated_at")
        )

        chats = []

        for convo in conversations:
            conversation = convo.conversation or []

            # ✅ V2 SAFE: find first user_message
            for msg in conversation:
                if msg.get("schema_version") == "v2" and msg.get("user_message"):
                    chats.append({
                        "chat_id": convo.chat_id,
                        "title": msg["user_message"][:80]
                    })
                    break

        return Response({"chats": chats})



# ======================================================
# CHAT DETAIL VIEW
# ======================================================
class AIBotChatDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    @require_bearer_token
    def post(self, request):
        chat_id = request.data.get("chat_id")
        user_id = request.user_data.get("id")

        if not chat_id:
            return Response({"error": "chat_id required"}, status=400)

        convo = AIConversation.objects.filter(
            chat_id=chat_id,
            user_id=user_id
        ).first()

        if not convo:
            return Response({"error": "Chat not found"}, status=404)

        conversation = convo.conversation or []

        # -------------------------------
        # STRICT V2 VALIDATION (OPTIONAL)
        # -------------------------------
        v2_conversation = [
            item for item in conversation
            if item.get("schema_version") == "v2"
        ]

        # -------------------------------
        # SORT BY USER TIMESTAMP
        # -------------------------------
        v2_conversation.sort(
            key=lambda x: x.get("user_timestamp", "")
        )

        return Response({
            "chat_id": convo.chat_id,
            "schema_version": "v2",
            "total_interactions": len(v2_conversation),
            "conversation": v2_conversation,
            "created_at": convo.created_at,
            "updated_at": convo.updated_at,
        })

# ======================================================
# CHAT DELETE VIEW
# ======================================================

class AIBotChatDeleteView(APIView):
    authentication_classes = []
    permission_classes = []

    @require_bearer_token
    def post(self, request):
        chat_id = request.data.get("chat_id")
        user_id = request.user_data.get("id")

        if not chat_id:
            return Response({"error": "chat_id required"}, status=400)

        convo = AIConversation.objects.filter(
            chat_id=chat_id,
            user_id=user_id
        ).first()

        if not convo:
            return Response({"error": "Chat not found"}, status=404)

        convo.delete()
        return Response({"success": True})