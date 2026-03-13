from django.db import migrations


NEW_DEFAULTS = [
    'School Supplies (Ballpen, Paper, Notebook)',
    'Electronics & Gadgets (Laptop, Phone, Calculator)',
    'Personal Care (Sanitizer, Tissue, Umbrella)',
    'Food & Beverage (Water bottle, Lunchbox, Snacks)',
    'Clothing & Accessories (ID, Jacket, Uniform)',
    'Documents (Books, Modules, Handouts)',
    'Others',
]

OLD_DEFAULTS = [
    'Electronics',
    'Documents',
    'Clothing',
    'Accessories',
    'Phone',
    'Wallet',
    'ID',
    'Others',
]


def update_default_categories(apps, schema_editor):
    Category = apps.get_model('users', 'Category')

    existing = list(Category.objects.all())
    existing_names = [c.name for c in existing]

    # If the project is still using the original seeded defaults (and nothing else),
    # replace them with the newer formatted defaults.
    if len(existing_names) == len(OLD_DEFAULTS) and set(existing_names) == set(OLD_DEFAULTS):
        Category.objects.all().delete()
        for idx, name in enumerate(NEW_DEFAULTS):
            Category.objects.create(name=name, sort_order=idx, is_active=True)
        return

    # Otherwise, be conservative: ensure the new defaults exist and are active.
    for idx, name in enumerate(NEW_DEFAULTS):
        obj, created = Category.objects.get_or_create(
            name=name,
            defaults={'sort_order': idx, 'is_active': True},
        )
        if not created:
            changed = False
            if obj.sort_order != idx:
                obj.sort_order = idx
                changed = True
            if not obj.is_active:
                obj.is_active = True
                changed = True
            if changed:
                obj.save(update_fields=['sort_order', 'is_active'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_alter_sitesettings_ai_min_score_default'),
    ]

    operations = [
        migrations.RunPython(update_default_categories, noop_reverse),
    ]

