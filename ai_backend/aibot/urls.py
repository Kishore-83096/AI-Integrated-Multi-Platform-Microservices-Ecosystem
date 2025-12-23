from django.urls import path
from .views import  AIBotChatView,UserProfileView, AIBotChatDeleteView,AIBotChatSidebarView,AIBotChatDetailView

urlpatterns = [
    #path('test-token/', TestTokenView.as_view(), name='test-token'),
    path('chat/', AIBotChatView.as_view(), name='chat'),
    path('chat-sidebar/', AIBotChatSidebarView.as_view(), name='chat-sidebar'),
    path('chat-detail/', AIBotChatDetailView.as_view(), name='chat-detail'),
    path('del-aichat/',AIBotChatDeleteView.as_view(),name='del-aichat'),
    path("user-profile/", UserProfileView.as_view(), name="user-profile"),

]
