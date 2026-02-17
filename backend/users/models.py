from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    # Role choices based on your frontend types
    ROLE_CHOICES = (
        ('Admin', 'Admin'),
        ('Student', 'Student'),
        ('Teacher', 'Teacher'),
        ('Guidance', 'Guidance'),
    )

    # Extended fields
    # 'userId' in frontend maps to 'school_id' here
    school_id = models.CharField(max_length=20, unique=True, help_text="ID Number like A-01 or 11738...")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='Student')
    year_level = models.CharField(max_length=50, blank=True, default='')
    room = models.CharField(max_length=100, blank=True, default='')
    gender = models.CharField(max_length=30, blank=True, default='')
    
    # We can use first_name/last_name from AbstractUser, but to match your frontend 'name' exactly:
    # We can either make a property or a field. Let's make it a property that combines names, 
    # or just use first_name as the full name if you prefer simple mapping.
    # For this implementation, I will rely on Django's standard fields but add a property for the serializer.
    
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return f"{self.school_id} - {self.username}"

    class Meta:
        ordering = ['-date_joined']

class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        # Code expires after 15 minutes (900 seconds)
        return (timezone.now() - self.created_at).total_seconds() < 900


class SiteSettings(models.Model):
    org_name = models.CharField(max_length=255, default='San Isidro National High School')
    org_tagline = models.CharField(max_length=255, blank=True, default='Verified Lost & Found')
    org_logo = models.ImageField(upload_to='site/', null=True, blank=True)

    # Reports
    default_new_report_status = models.CharField(max_length=16, default='Pending')
    home_visible_report_statuses = models.JSONField(default=list, blank=True)

    # Claims
    claim_require_proof_image = models.BooleanField(default=False)

    # AI
    ai_min_score = models.FloatField(default=75.0)
    ai_matching_enabled = models.BooleanField(default=True)

    # User Home
    user_home_chatbot_visible = models.BooleanField(default=True)
    user_home_chat_notification_dot = models.BooleanField(default=True)

    # Email controls
    email_master_enabled = models.BooleanField(default=True)
    email_notify_verified_reports = models.BooleanField(default=True)
    email_notify_claim_results = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'

    def save(self, *args, **kwargs):
        if not self.home_visible_report_statuses:
            self.home_visible_report_statuses = ['Verified']
        self.ai_min_score = max(0.0, min(100.0, float(self.ai_min_score or 0.0)))
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(
            id=1,
            defaults={'home_visible_report_statuses': ['Verified']},
        )
        if not obj.home_visible_report_statuses:
            obj.home_visible_report_statuses = ['Verified']
            obj.save(update_fields=['home_visible_report_statuses'])
        return obj

    def __str__(self):
        return 'Global Site Settings'


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name
