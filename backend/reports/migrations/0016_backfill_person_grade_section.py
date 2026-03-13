from django.db import migrations


def backfill_person_grade_section(apps, schema_editor):
    Report = apps.get_model('reports', 'Report')
    User = apps.get_model('users', 'User')

    users_by_id = {u.id: u for u in User.objects.all().only('id', 'year_level', 'room')}

    to_update = []
    for report in Report.objects.all().only('id', 'reporter_id', 'person_grade', 'person_section'):
        user = users_by_id.get(report.reporter_id)
        if not user:
            continue

        changed = False
        if not (report.person_grade or '').strip() and (user.year_level or '').strip():
            report.person_grade = (user.year_level or '').strip()
            changed = True
        if not (report.person_section or '').strip() and (user.room or '').strip():
            report.person_section = (user.room or '').strip()
            changed = True

        if changed:
            to_update.append(report)

    if to_update:
        Report.objects.bulk_update(to_update, ['person_grade', 'person_section'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0015_report_person_grade_section'),
        ('users', '0008_deactivate_legacy_categories'),
    ]

    operations = [
        migrations.RunPython(backfill_person_grade_section, noop_reverse),
    ]

