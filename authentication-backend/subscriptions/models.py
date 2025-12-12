from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class SubscriptionPlan(models.Model):
    PLAN_TYPE_CHOICES = [
        ('free', 'Free'),
        ('monthly', 'Monthly'),
        ('2months', '2 Months'),
        ('3months', '3 Months'),
        ('6months', '6 Months'),
        ('yearly', 'Yearly'),
    ]

    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES)
    duration_days = models.IntegerField(help_text="Duration of the plan in days")
    features = models.JSONField(default=list, blank=True)  # e.g., ['ad-free', 'premium content']
    max_devices = models.IntegerField(default=1)  # Useful for music app
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class UserSubscription(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE, related_name='user_subscriptions')
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    auto_renew = models.BooleanField(default=False)
    payment_id = models.CharField(max_length=100, blank=True)  # Optional: store payment reference

    def __str__(self):
        return f"{self.user.username} - {self.plan.name}"
