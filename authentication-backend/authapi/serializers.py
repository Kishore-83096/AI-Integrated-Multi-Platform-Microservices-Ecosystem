from rest_framework import serializers
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth import get_user_model
from subscriptions.models import SubscriptionPlan, UserSubscription
from users.models import Profile, PaymentCard, Address
from django.contrib.auth.tokens import default_token_generator

User = get_user_model()

# -------------------------------
# User Serializer (NEW)
# -------------------------------
class UserSerializer(serializers.ModelSerializer):
    """
    Nested serializer for Django's User model.
    Includes username and email (can add more later if needed).
    """
    class Meta:
        model = User
        fields = ['username', 'email']


# -------------------------------
# User Registration Serializer
# -------------------------------
class UserRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    email = serializers.EmailField(read_only=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def create(self, validated_data):
        username = validated_data['username']
        password = validated_data['password']
        email = f"{username.lower()}@ivc.com"
        user = User.objects.create_user(username=username, email=email, password=password)
        return user


# -------------------------------
# Subscription Plan Serializer
# -------------------------------
class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'description', 'price', 'plan_type',
            'duration_days', 'features', 'max_devices',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


# -------------------------------
# User Subscription Serializer
# -------------------------------
class UserSubscriptionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'user', 'plan', 'start_date', 'end_date',
            'status', 'auto_renew', 'payment_id'
        ]
        read_only_fields = ['start_date']




# -------------------------------
# Profile Serializer (FINAL FIX)
# -------------------------------
class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    # FIX 1: Use ImageField for writing (file uploads) and ModelField for reading (relative URL).
    # Since we removed get_avatar(), DRF will automatically use the Model's ImageField
    # for serialization (GET) and deserialization (PATCH/PUT).
    # NOTE: The field name is kept as 'avatar' as it is in the Model.
    # We DON'T need to explicitly define it here unless we add write_only fields.
    
    # FIX 2: Add a write-only field to accept the 'remove_avatar' flag from the frontend.
    remove_avatar = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Profile
        fields = [
            'id', 'user', 'full_name', 'avatar', 'bio', # 'avatar' is now the writable Model field
            'date_of_birth', 'phone_number', 'gender',
            'shipping_address', 'billing_address',
            'preferred_payment_method', 'upi_id',
            'created_at', 'updated_at',
            'remove_avatar',  # Add the new field
        ]
        read_only_fields = ['created_at', 'updated_at']

    # We must REMOVE the get_avatar method and rely on the Model's ImageField
    # to return the relative URL, which your frontend should handle (as discussed previously).
    
    # FIX 3: Override the 'update' method to handle the 'remove_avatar' logic.
    def update(self, instance, validated_data):
        # Pop the remove_avatar flag from the data
        remove = validated_data.pop('remove_avatar', False)

        if remove:
            # If true, delete the file and set the field to None in the instance
            if instance.avatar:
                # The signal 'delete_old_avatar_on_change' handles file deletion, 
                # but it's cleaner to handle it here explicitly for 'remove_avatar' action.
                instance.avatar.delete(save=False) 
            instance.avatar = None

        # Call the parent update method to save remaining fields 
        # (including the new 'avatar' file if it was present in validated_data)
        return super().update(instance, validated_data)





# -------------------------------
# Payment Card Serializer
# -------------------------------
class PaymentCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentCard
        fields = [
            'id', 'card_holder_name', 'card_last4',
            'card_expiry_month', 'card_expiry_year',
            'card_type', 'is_default', 'created_at'
        ]
        read_only_fields = ['created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('user', None)
        return super().update(instance, validated_data)


# -------------------------------
# Address Serializer
# -------------------------------
class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id', 'full_name', 'phone_number',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'is_default', 'address_type',
            'created_at'
        ]
        read_only_fields = ['created_at']


# -------------------------------
# Login Serializer
# -------------------------------
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


# -------------------------------
# Password Reset Request Serializer
# -------------------------------
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user is associated with this email address.")
        return value


# -------------------------------
# Password Reset Confirm Serializer
# -------------------------------
class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        uid = attrs.get('uid')
        token = attrs.get('token')
        new_password = attrs.get('new_password')

        try:
            uid = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError("Invalid uid.")

        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError("Invalid or expired token.")

        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        new_password = self.validated_data['new_password']
        user.set_password(new_password)
        user.save()
        return user
