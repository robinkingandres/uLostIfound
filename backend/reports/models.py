from django.db import models
from django.conf import settings

class Report(models.Model):
    # --- Choices for Report Fields ---
    REPORT_STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Verified', 'Verified'),
        ('Claimed', 'Claimed'),
        ('Rejected', 'Rejected'),
    )

    REPORT_TYPE_CHOICES = (
        ('Lost', 'Lost'),
        ('Found', 'Found'),
    )

    # --- Foreign Key (Links to your User model) ---
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='reports',
        verbose_name='Reported By'
    )
    
    # --- Core Item Details (Matches frontend input fields) ---
    item_name = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=10, choices=REPORT_TYPE_CHOICES)
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    date_lost_or_found = models.DateField() # Renamed to 'date' on the frontend
    
    # --- Admin/Status Fields ---
    status = models.CharField(max_length=10, choices=REPORT_STATUS_CHOICES, default='Pending')
    date_reported = models.DateTimeField(auto_now_add=True) # Automatically set on creation
    
    # --- Media Field ---
    image = models.ImageField(upload_to='report_images/', null=True, blank=True)

    class Meta:
        ordering = ['-date_reported']
        verbose_name = 'Lost/Found Report'
        verbose_name_plural = 'Lost/Found Reports'

    def __str__(self):
        return f"[{self.type}] {self.item_name} ({self.status})"