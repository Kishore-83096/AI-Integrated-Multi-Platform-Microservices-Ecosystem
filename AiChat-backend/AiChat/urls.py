from django.urls import path
from .views import ChatView

urlpatterns = [
    path('aibot/', ChatView.as_view(), name='chat'),
]
