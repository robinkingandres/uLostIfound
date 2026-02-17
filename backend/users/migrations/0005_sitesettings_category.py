from django.db import migrations, models


def seed_initial_data(apps, schema_editor):
    SiteSettings = apps.get_model('users', 'SiteSettings')
    Category = apps.get_model('users', 'Category')

    SiteSettings.objects.get_or_create(
        id=1,
        defaults={
            'org_name': 'San Isidro National High School',
            'org_tagline': 'Verified Lost & Found',
            'default_new_report_status': 'Pending',
            'home_visible_report_statuses': ['Verified'],
            'claim_require_proof_image': False,
            'ai_min_score': 50.0,
            'ai_matching_enabled': True,
            'user_home_chatbot_visible': True,
            'user_home_chat_notification_dot': True,
            'email_master_enabled': True,
            'email_notify_verified_reports': True,
            'email_notify_claim_results': True,
        },
    )

    defaults = [
        'Electronics',
        'Documents',
        'Clothing',
        'Accessories',
        'Phone',
        'Wallet',
        'ID',
        'Others',
    ]
    for idx, name in enumerate(defaults):
        Category.objects.get_or_create(name=name, defaults={'sort_order': idx, 'is_active': True})


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_user_profile_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name_plural': 'Categories',
                'ordering': ['sort_order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='SiteSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('org_name', models.CharField(default='San Isidro National High School', max_length=255)),
                ('org_tagline', models.CharField(blank=True, default='Verified Lost & Found', max_length=255)),
                ('org_logo', models.ImageField(blank=True, null=True, upload_to='site/')),
                ('default_new_report_status', models.CharField(default='Pending', max_length=16)),
                ('home_visible_report_statuses', models.JSONField(blank=True, default=list)),
                ('claim_require_proof_image', models.BooleanField(default=False)),
                ('ai_min_score', models.FloatField(default=50.0)),
                ('ai_matching_enabled', models.BooleanField(default=True)),
                ('user_home_chatbot_visible', models.BooleanField(default=True)),
                ('user_home_chat_notification_dot', models.BooleanField(default=True)),
                ('email_master_enabled', models.BooleanField(default=True)),
                ('email_notify_verified_reports', models.BooleanField(default=True)),
                ('email_notify_claim_results', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Site Settings',
                'verbose_name_plural': 'Site Settings',
            },
        ),
        migrations.RunPython(seed_initial_data, migrations.RunPython.noop),
    ]
