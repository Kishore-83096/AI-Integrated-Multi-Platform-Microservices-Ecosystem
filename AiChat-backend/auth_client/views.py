from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import auth_register, auth_login
from rest_framework_simplejwt.tokens import AccessToken, TokenError


# -------------------------------
# Register View
# -------------------------------
class RegisterView(APIView):
    authentication_classes = []  # Disable authentication
    permission_classes = []

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "Username and password are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        result = auth_register(username, password)

        if "error" in result:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        if "message" in result:
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


# -------------------------------
# Login View
# -------------------------------
class LoginView(APIView):
    authentication_classes = []  # Disable authentication
    permission_classes = []

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "Username and password are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        result = auth_login(username, password)

        if "error" in result:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        if "access" in result and "refresh" in result:
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_401_UNAUTHORIZED)


# -------------------------------
# Optional: Verify Token View
# -------------------------------
class VerifyTokenView(APIView):
    authentication_classes = []  
    permission_classes = []

    def get(self, request):
        token = request.headers.get("Authorization")

        if not token:
            return Response(
                {"error": "Authorization header missing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if token.startswith("Bearer "):
            token = token[7:]  # remove Bearer

        try:
            decoded = AccessToken(token)  # verifies signature + expiry
            return Response(
                {
                    "valid": True,
                    "user_id": decoded["user_id"],
                    "expires": decoded["exp"]
                },
                status=status.HTTP_200_OK
            )

        except TokenError as e:
            return Response(
                {"valid": False, "error": str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

