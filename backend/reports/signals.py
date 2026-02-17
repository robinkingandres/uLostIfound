from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .ai_matching import process_new_report
from .models import Report


@receiver(post_save, sender=Report)
def auto_ai_match_on_new_report(sender, instance, created, raw=False, **kwargs):
    """
    Trigger AI matching automatically whenever a Lost/Found report is created or updated.
    Runs on transaction commit so the report is fully persisted before scanning.
    """
    if raw:
        return
    if instance.type not in ['Lost', 'Found']:
        return
    if instance.status not in ['Pending', 'Verified']:
        return

    def _run_match():
        try:
            process_new_report(instance)
        except Exception as exc:
            print(f"AI auto-match failed for report {instance.id}: {exc}")

    transaction.on_commit(_run_match)
