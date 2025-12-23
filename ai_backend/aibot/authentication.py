from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth.models import AnonymousUser

class StatelessJWTAuthentication(JWTAuthentication):
    """
    Validates JWT but does NOT fetch user from DB.
    """
    print("StatelessJWTAuthentication initialized")
    def get_user(self, validated_token):
        print("StatelessJWTAuthentication get_user called")
        # return dummy user instead of querying auth_user
        return AnonymousUser()
