from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0011_report_person_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='report',
            name='returned_by_photo',
            field=models.ImageField(
                blank=True,
                help_text='Photo of the person who returned the found item (Guidance reports only).',
                null=True,
                upload_to='returned_by_photos/',
            ),
        ),
    ]
