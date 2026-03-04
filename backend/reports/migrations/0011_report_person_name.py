from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0010_claim_manual_claimant_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='report',
            name='person_name',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Name of the person linked to the report (owner/claimer). Required for lost reports.',
                max_length=255,
            ),
        ),
    ]
