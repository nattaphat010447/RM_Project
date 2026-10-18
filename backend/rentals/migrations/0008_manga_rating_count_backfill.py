from django.db import migrations, models
from django.db.models import Avg, Count


def backfill(apps, schema_editor):
    Manga = apps.get_model('rentals', 'Manga')
    MangaReview = apps.get_model('rentals', 'MangaReview')
    User = apps.get_model('rentals', 'User')
    UserPreference = apps.get_model('rentals', 'UserPreference')

    stats = {
        row['manga_id']: row
        for row in MangaReview.objects.values('manga_id').annotate(avg=Avg('rating'), count=Count('id'))
    }
    for manga in Manga.objects.all():
        row = stats.get(manga.id)
        manga.avg_rating = round(row['avg'], 2) if row else 0
        manga.rating_count = row['count'] if row else 0
        manga.save(update_fields=['avg_rating', 'rating_count'])

    # Users who picked their 4 favourites before 0007 existed have already
    # finished onboarding; without this they could overwrite preferences once.
    User.objects.filter(
        id__in=UserPreference.objects.values('user_id')
    ).update(onboarding_completed=True)


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0007_add_onboarding_completed'),
    ]

    operations = [
        migrations.AddField(
            model_name='manga',
            name='rating_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
