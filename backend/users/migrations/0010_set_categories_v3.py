from django.db import migrations


CATEGORY_V3 = [
    'School Supplies',
    'Tech & Gadgets',
    'Books & Modules',
    'Daily Essentials',
    'Food & Clothes',
    'Others',
]


def set_categories_v3(apps, schema_editor):
    Category = apps.get_model('users', 'Category')

    keep_names = set(CATEGORY_V3)

    for idx, name in enumerate(CATEGORY_V3):
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

    Category.objects.exclude(name__in=keep_names).update(is_active=False)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_set_categories_v2'),
    ]

    operations = [
        migrations.RunPython(set_categories_v3, noop_reverse),
    ]
