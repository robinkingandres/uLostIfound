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
    person_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Name of the person linked to the report (owner/claimer). Required for lost reports."
    )
    description = models.TextField()
    type = models.CharField(max_length=10, choices=REPORT_TYPE_CHOICES)
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    date_lost_or_found = models.DateField()
    status = models.CharField(max_length=10, choices=REPORT_STATUS_CHOICES, default='Pending')
    date_reported = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='report_images/', null=True, blank=True)
    returned_by_photo = models.ImageField(
        upload_to='returned_by_photos/',
        null=True,
        blank=True,
        help_text="Photo of the person who returned the found item (Guidance reports only)."
    )

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
    claimant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='claims',
        null=True,
        blank=True
    )
    claimant_full_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Manual claimant full name for walk-in claims without system account."
    )
    claimant_school_id = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Manual claimant school ID or identifier."
    )
    proof_description = models.TextField(help_text="Describe why this item belongs to you (e.g., specific marks, contents).")
    proof_image = models.ImageField(upload_to='claim_proofs/', null=True, blank=True, help_text="Upload an image as proof of ownership.")
    claimant_photo = models.ImageField(
        upload_to='claimant_photos/',
        null=True,
        blank=True,
        help_text="Photo of the claimant for in-person identity verification and release documentation."
    )
    claimant_id_photo = models.ImageField(
        upload_to='claimant_id_photos/',
        null=True,
        blank=True,
        help_text="Photo of claimant's valid ID or student ID."
    )
    authorization_letter = models.ImageField(
        upload_to='authorization_letters/',
        null=True,
        blank=True,
        help_text="Authorization letter when claimant is not the owner."
    )
    claimant_contact = models.CharField(
        max_length=30,
        blank=True,
        default='',
        help_text="Optional contact number for the claimant."
    )
    status = models.CharField(max_length=10, choices=CLAIM_STATUS_CHOICES, default='Pending')
    date_created = models.DateTimeField(auto_now_add=True)
    rejection_reason = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-date_created']
        constraints = [
            models.UniqueConstraint(
                fields=['report', 'claimant'],
                name='unique_claim_per_user_per_report',
                condition=models.Q(claimant__isnull=False),
            ),
        ]

    def __str__(self):
        if self.claimant_full_name:
            claimant_label = self.claimant_full_name
        elif self.claimant:
            claimant_label = self.claimant.username
        else:
            claimant_label = "Unknown claimant"
        return f"Claim for {self.report.item_name} by {claimant_label}"
    
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


# --- AI MATCH MODEL ---
class AIMatch(models.Model):
    MATCH_STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    )

    lost_report = models.ForeignKey(
        Report, 
        on_delete=models.CASCADE, 
        related_name='lost_matches',
        limit_choices_to={'type': 'Lost'}
    )
    found_report = models.ForeignKey(
        Report, 
        on_delete=models.CASCADE, 
        related_name='found_matches',
        limit_choices_to={'type': 'Found'}
    )
    
    # Match scores (0-100)
    visual_score = models.FloatField(default=0, help_text="Image similarity score from CLIP (0-100)")
    text_score = models.FloatField(default=0, help_text="Text/description similarity score (0-100)")
    match_score = models.FloatField(default=0, help_text="Combined overall match score (0-100)")
    
    status = models.CharField(max_length=10, choices=MATCH_STATUS_CHOICES, default='Pending')
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)
    
    # Store whether users have been notified
    lost_reporter_notified = models.BooleanField(default=False)
    found_reporter_notified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-match_score', '-date_created']
        unique_together = ['lost_report', 'found_report']
        verbose_name = 'AI Match'
        verbose_name_plural = 'AI Matches'

    def __str__(self):
        return f"Match: {self.lost_report.item_name} <-> {self.found_report.item_name} ({self.match_score}%)"
