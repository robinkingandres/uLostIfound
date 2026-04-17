from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0008_claim_unique_per_user_report'),
    ]

    operations = [
        migrations.AddField(
            model_name='claim',
            name='claimant_photo',
            field=models.ImageField(
                blank=True,
                help_text='Photo of the claimant for in-person identity verification and release documentation.',
                null=True,
                upload_to='claimant_photos/',
            ),
        ),
    ]
