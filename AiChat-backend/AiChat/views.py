from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken, TokenError
from .services import generate_ai_response
import asyncio
from asgiref.sync import sync_to_async

class ChatView(APIView):
    authentication_classes = []   # disable DRF auth completely
    permission_classes = []       # we authenticate manually

    def post(self, request):
        token = request.headers.get("Authorization")
        if not token:
            return Response({"error": "Authorization header missing"}, status=status.HTTP_400_BAD_REQUEST)

        if token.startswith("Bearer "):
            token = token[7:]

        # Manual token verify (safe in sync)
        try:
            decoded = AccessToken(token)
            user_id = decoded.get("user_id")
        except TokenError as e:
            return Response({"valid": False, "error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        user_message = request.data.get("message", "")
        if not user_message:
            return Response({"error": "Message cannot be empty"}, status=status.HTTP_400_BAD_REQUEST)

        # Run AI generation asynchronously without making view async
        ai_reply = asyncio.run(self.generate_async(user_message))

        return Response({
            "user_id": user_id,
            "message_received": user_message,
            "reply": ai_reply,
        }, status=status.HTTP_200_OK)

    async def generate_async(self, message):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, generate_ai_response, message)
