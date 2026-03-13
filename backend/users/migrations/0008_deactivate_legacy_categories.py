from django.db import migrations


LEGACY_CATEGORY_NAMES = [
    'Phone',
    'Wallet',
    'ID',
    'Electronics',
    'Documents',
    'Clothing',
    'Accessories',
]


def deactivate_legacy_categories(apps, schema_editor):
    Category = apps.get_model('users', 'Category')
    Category.objects.filter(name__in=LEGACY_CATEGORY_NAMES).update(is_active=False)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_update_default_categories'),
    ]

    operations = [
        migrations.RunPython(deactivate_legacy_categories, noop_reverse),
    ]

