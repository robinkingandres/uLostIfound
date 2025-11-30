from django.db import models
from django.conf import settings

class Report(models.Model):
    # ... (Keep existing Report code unchanged) ...
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

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='reports',
        verbose_name='Reported By'
    )
    
    item_name = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=10, choices=REPORT_TYPE_CHOICES)
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    date_lost_or_found = models.DateField()
    status = models.CharField(max_length=10, choices=REPORT_STATUS_CHOICES, default='Pending')
    date_reported = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='report_images/', null=True, blank=True)

    class Meta:
        ordering = ['-date_reported']
        verbose_name = 'Lost/Found Report'
        verbose_name_plural = 'Lost/Found Reports'

    def __str__(self):
        return f"[{self.type}] {self.item_name} ({self.status})"

# --- NEW CLAIM MODEL ---
class Claim(models.Model):
    CLAIM_STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Claimed', 'Claimed'),
        ('Rejected', 'Rejected'),
    )

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='claims')
    claimant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='claims')
    proof_description = models.TextField(help_text="Describe why this item belongs to you (e.g., specific marks, contents).")
    status = models.CharField(max_length=10, choices=CLAIM_STATUS_CHOICES, default='Pending')
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_created']

    def __str__(self):
        return f"Claim for {self.report.item_name} by {self.claimant.username}"
    
class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    # Optional: Link to a specific report if you want to make the notification clickable
    report = models.ForeignKey('Report', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.message[:20]}..."