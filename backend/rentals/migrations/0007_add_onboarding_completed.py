from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0006_add_manga_genre_trgm_index'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='onboarding_completed',
            field=models.BooleanField(default=False),
        ),
    ]
