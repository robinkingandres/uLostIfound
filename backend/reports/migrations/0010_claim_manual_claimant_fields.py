from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0009_claim_claimant_photo'),
    ]

    operations = [
        migrations.AddField(
            model_name='claim',
            name='claimant_full_name',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Manual claimant full name for walk-in claims without system account.',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='claim',
            name='claimant_school_id',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Manual claimant school ID or identifier.',
                max_length=100,
            ),
        ),
    ]
