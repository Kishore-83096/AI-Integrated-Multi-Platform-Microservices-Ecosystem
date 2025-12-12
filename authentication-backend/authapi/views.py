from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from rest_framework.authentication import BasicAuthentication, SessionAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics

from subscriptions.models import SubscriptionPlan, UserSubscription
from users.models import Profile,PaymentCard

from .serializers import (
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
    ProfileSerializer,
    UserRegistrationSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    PaymentCardSerializer,
    AddressSerializer
)








# -------------------------------
# Subscription Plan View
# -------------------------------
class SubscriptionPlanListView(APIView):
    authentication_classes = []  # Disable authentication for this view
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        plans = SubscriptionPlan.objects.all()
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data)






# -------------------------------
# User Subscription View
# -------------------------------
class UserSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscriptions = UserSubscription.objects.filter(user=request.user)
        serializer = UserSubscriptionSerializer(subscriptions, many=True)
        return Response(serializer.data)






# -------------------------------
# Profile View
# -------------------------------
class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        # Pass request to serializer
        return {'request': self.request}

    def get(self, request):
        profile = get_object_or_404(Profile, user=request.user)
        serializer = ProfileSerializer(profile, context=self.get_serializer_context())
        return Response(serializer.data)

    def put(self, request):
        profile = get_object_or_404(Profile, user=request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True, context=self.get_serializer_context())
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





# -------------------------------
# Profile Update View
# -------------------------------
class ProfileUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.profile





# -------------------------------
# Payment Card View
# -------------------------------
class PaymentCardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cards = request.user.payment_cards.all()
        serializer = PaymentCardSerializer(cards, many=True, context={"request": request})
        return Response(serializer.data)

    def put(self, request):
        card_id = request.data.get("id")
        cards = request.user.payment_cards.all()

        if card_id:
            # Update existing card
            card = get_object_or_404(cards, pk=card_id)
            serializer = PaymentCardSerializer(card, data=request.data, partial=True, context={"request": request})
        else:
            # Add new card
            if cards.count() >= 6:
                return Response(
                    {"error": "You can add a maximum of 6 cards."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            serializer = PaymentCardSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        card_id = request.data.get("id")
        if not card_id:
            return Response({"error": "Card ID required for deletion"}, status=status.HTTP_400_BAD_REQUEST)

        card = get_object_or_404(request.user.payment_cards, pk=card_id)
        card.delete()
        return Response({"message": "Card deleted successfully"}, status=status.HTTP_204_NO_CONTENT)



# -------------------------------
# Address View
# -------------------------------
class AddressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        addresses = request.user.addresses.all()
        serializer = AddressSerializer(addresses, many=True)
        return Response(serializer.data)

    def put(self, request):
        address_id = request.data.get("id")
        addresses = request.user.addresses.all()

        if address_id:
            # Update existing address
            address = get_object_or_404(addresses, pk=address_id)
            serializer = AddressSerializer(address, data=request.data, partial=True)
        else:
            # Add new address
            if addresses.count() >= 10:
                return Response(
                    {"error": "You can save a maximum of 10 addresses."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            serializer = AddressSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        address_id = request.data.get("id")
        if not address_id:
            return Response({"error": "Address ID required for deletion"}, status=status.HTTP_400_BAD_REQUEST)

        address = get_object_or_404(request.user.addresses, pk=address_id)
        address.delete()
        return Response({"message": "Address deleted successfully"}, status=status.HTTP_204_NO_CONTENT)





# -------------------------------
# User Registration View
# -------------------------------




class RegisterView(APIView):
    authentication_classes = []  # Disable authentication for this view
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.save()
            return Response({
                "message": "User registered successfully",
                "username": user.username,
                "email": user.email 
            }, status=status.HTTP_201_CREATED)





# -------------------------------
# Login View
# -------------------------------
class LoginView(APIView):
    authentication_classes = []  # Disable authentication for this view
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            user = authenticate(request, username=username, password=password)
            if user:
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                return Response({
                    "message": "Login successful",
                    "access": str(refresh.access_token),
                    "refresh": str(refresh)
                }, status=status.HTTP_200_OK)
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





# -------------------------------
# Password Reset Request View
# -------------------------------
class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"http://localhost:8000/reset-password-confirm/?uid={uid}&token={token}"

            # Send email (will fail silently if no backend configured)
            send_mail(
                'Password Reset Request',
                f'Use the following link to reset your password:\n{reset_link}',
                'no-reply@example.com',
                [email],
                fail_silently=True,
            )

            # 👇 Add reset link in response (for Postman testing only)
            return Response(
                {"message": "Password reset link sent.", "reset_link": reset_link},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





# -------------------------------
# Password Reset Confirm View
# -------------------------------
class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

