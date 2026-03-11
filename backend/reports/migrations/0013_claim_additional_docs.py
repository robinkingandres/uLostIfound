from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0012_report_returned_by_photo'),
    ]

    operations = [
        migrations.AddField(
            model_name='claim',
            name='claimant_contact',
            field=models.CharField(blank=True, default='', help_text='Optional contact number for the claimant.', max_length=30),
        ),
        migrations.AddField(
            model_name='claim',
            name='claimant_id_photo',
            field=models.ImageField(blank=True, help_text="Photo of claimant's valid ID or student ID.", null=True, upload_to='claimant_id_photos/'),
        ),
        migrations.AddField(
            model_name='claim',
            name='authorization_letter',
            field=models.ImageField(blank=True, help_text='Authorization letter when claimant is not the owner.', null=True, upload_to='authorization_letters/'),
        ),
    ]
