from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Role choices based on your frontend types
    ROLE_CHOICES = (
        ('Admin', 'Admin'),
        ('Student', 'Student'),
        ('Teacher', 'Teacher'),
    )

    # Extended fields
    # 'userId' in frontend maps to 'school_id' here
    school_id = models.CharField(max_length=20, unique=True, help_text="ID Number like A-01 or 11738...")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='Student')
    
    # We can use first_name/last_name from AbstractUser, but to match your frontend 'name' exactly:
    # We can either make a property or a field. Let's make it a property that combines names, 
    # or just use first_name as the full name if you prefer simple mapping.
    # For this implementation, I will rely on Django's standard fields but add a property for the serializer.
    
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return f"{self.school_id} - {self.username}"

    class Meta:
        ordering = ['-date_joined']