from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0014_claim_nullable_claimant'),
    ]

    operations = [
        migrations.AddField(
            model_name='report',
            name='person_grade',
            field=models.CharField(blank=True, default='', help_text='Grade level of the person linked to the report.', max_length=50),
        ),
        migrations.AddField(
            model_name='report',
            name='person_section',
            field=models.CharField(blank=True, default='', help_text='Section/room of the person linked to the report.', max_length=100),
        ),
    ]

