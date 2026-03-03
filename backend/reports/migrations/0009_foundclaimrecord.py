from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0008_claim_unique_per_user_report'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='FoundClaimRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('full_name', models.CharField(max_length=255)),
                ('student_id', models.CharField(max_length=50)),
                ('course_year', models.CharField(max_length=100)),
                ('contact_number', models.CharField(max_length=30)),
                ('date_lost', models.DateField()),
                ('date_claimed', models.DateField(default=django.utils.timezone.localdate)),
                ('location_lost', models.CharField(max_length=255)),
                ('detailed_description', models.TextField()),
                ('proof_image', models.ImageField(blank=True, null=True, upload_to='claim_proofs/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('guidance_officer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_found_claim_records', to=settings.AUTH_USER_MODEL)),
                ('report', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='found_claim_record', to='reports.report')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
