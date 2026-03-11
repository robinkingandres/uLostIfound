from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0013_claim_additional_docs'),
    ]

    operations = [
        migrations.AlterField(
            model_name='claim',
            name='claimant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='claims', to='users.user'),
        ),
        migrations.RemoveConstraint(
            model_name='claim',
            name='unique_claim_per_user_per_report',
        ),
        migrations.AddConstraint(
            model_name='claim',
            constraint=models.UniqueConstraint(condition=models.Q(('claimant__isnull', False)), fields=('report', 'claimant'), name='unique_claim_per_user_per_report'),
        ),
    ]
