from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_sitesettings_category'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sitesettings',
            name='ai_min_score',
            field=models.FloatField(default=75.0),
        ),
    ]
