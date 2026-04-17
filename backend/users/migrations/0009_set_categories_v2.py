from django.db import migrations


CATEGORY_V2 = [
    'School Supplies (Ballpen, Paper, Notebook)',
    'Electronics & Gadgets (Laptop / Tablet, Scientific Calculator, Charger / Power bank, Flash drive)',
    'Books & Notebooks (Textbooks, Subject notebooks, Printed modules, Planner / Journal)',
    'Personal Care & Hygiene (Hand sanitizer, Pocket tissue, Lip balm, Small umbrella)',
    'Food & Beverage (Water bottle, Lunchbox, Snacks)',
    'Clothing & Accessories (School ID, Extra sweater or jacket, PE uniform / Gym clothes)',
    'Art & Project Materials (Colored pencils or markers, Glue stick, Scissors, Construction paper)',
    'Others',
]


def set_categories_v2(apps, schema_editor):
    Category = apps.get_model('users', 'Category')

    keep_names = set(CATEGORY_V2)

    for idx, name in enumerate(CATEGORY_V2):
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

    # Hide all other category values from the UI dropdowns.
    Category.objects.exclude(name__in=keep_names).update(is_active=False)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_deactivate_legacy_categories'),
    ]

    operations = [
        migrations.RunPython(set_categories_v2, noop_reverse),
    ]

