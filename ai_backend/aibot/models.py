from django.db import models
from django.db import models

class AIConversation(models.Model):
    """
    Stores AI bot conversations for authenticated users.
    Each conversation is linked to a chat session via auto-increment chat_id.
    Messages are stored in JSON format with role, content, and model info.
    """

    chat_id = models.AutoField(
        primary_key=True,
        help_text="Unique chat session ID (auto-increment)"
    )
    user_id = models.BigIntegerField(null=True, blank=True)
    username = models.CharField(max_length=150, blank=True)

    # Conversation JSON structure:
    # [
    #   {"role": "user", "content": "Hello", "model": "mistral"},
    #   {"role": "assistant", "content": "Hi! How can I help you?", "model": "mistral"}
    # ]
    conversation = models.JSONField(help_text="List of messages in this chat session")

    is_authenticated = models.BooleanField(default=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_conversations"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Chat {self.chat_id} | User: {self.username or 'Guest'}"



