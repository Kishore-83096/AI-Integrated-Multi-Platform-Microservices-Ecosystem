from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from users.models import Profile, PaymentCard, Address

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile_and_card(sender, instance, created, **kwargs):
    if created:
        # Create profile
        Profile.objects.create(user=instance)
        # Optionally, create a default payment card
        PaymentCard.objects.create(user=instance)
        Address.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # Save the profile if it exists
    if hasattr(instance, 'profile'):
        instance.profile.save()