from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
import os


User = get_user_model()
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=255, blank=True)
    avatar = models.ImageField(upload_to='users/avatars/', blank=True, null=True)
    bio = models.TextField(blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True)

    gender_choices = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    gender = models.CharField(max_length=1, choices=gender_choices, blank=True)

    shipping_address = models.TextField(blank=True)
    billing_address = models.TextField(blank=True)

    preferred_payment_method = models.CharField(max_length=50, blank=True)
    upi_id = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username


# -----------------------------------------------
# SIGNALS: Delete old avatar when updated or deleted
# -----------------------------------------------

@receiver(pre_save, sender=Profile)
def delete_old_avatar_on_change(sender, instance, **kwargs):
    """Delete old avatar file from storage when a new one is uploaded."""
    if not instance.pk:
        # Skip if the profile is new
        return

    try:
        old_avatar = sender.objects.get(pk=instance.pk).avatar
    except sender.DoesNotExist:
        return

    # Compare old vs new — delete if replaced
    new_avatar = instance.avatar
    if old_avatar and old_avatar != new_avatar:
        if os.path.isfile(old_avatar.path):
            os.remove(old_avatar.path)


@receiver(post_delete, sender=Profile)
def delete_avatar_on_delete(sender, instance, **kwargs):
    """Delete avatar file from storage when profile is deleted."""
    if instance.avatar:
        if os.path.isfile(instance.avatar.path):
            os.remove(instance.avatar.path)




from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.models import Q

class PaymentCard(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_cards')
    card_holder_name = models.CharField(max_length=255)
    card_last4 = models.CharField(max_length=4)
    card_expiry_month = models.CharField(max_length=2)
    card_expiry_year = models.CharField(max_length=4)
    card_type = models.CharField(max_length=20)  # e.g., VISA, MasterCard
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.card_type} ****{self.card_last4}"

    def clean(self):
        # Enforce a maximum of 6 cards per user when adding a new card
        if self.user.payment_cards.count() >= 6 and not self.pk:
            raise ValidationError("You can add a maximum of 6 cards.")

    def save(self, *args, **kwargs):
        # If this card is set as default, unset default for other cards of this user
        if self.is_default:
            PaymentCard.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'card_last4'], name='unique_card_per_user'),
        ]






from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.models import Q


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=15)
    
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default="India")  # Default can be set

    is_default = models.BooleanField(default=False)  # default delivery address
    address_type_choices = [
        ('H', 'Home'),
        ('W', 'Work'),
        ('O', 'Other'),
    ]
    address_type = models.CharField(max_length=1, choices=address_type_choices, default='H')

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name}, {self.address_line1}, {self.city}"

    def clean(self):
        # Enforce a maximum of 10 addresses per user
        if self.user.addresses.count() >= 10 and not self.pk:
            raise ValidationError("You can save a maximum of 10 addresses.")

        # Ensure only one default address per user
        if self.is_default:
            # Exclude self if updating
            other_defaults = self.user.addresses.filter(is_default=True).exclude(pk=self.pk)
            if other_defaults.exists():
                raise ValidationError("You can only have one default address.")

    def save(self, *args, **kwargs):
        # If this address is marked as default, unset other defaults
        if self.is_default:
            self.user.addresses.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-is_default', '-created_at']
