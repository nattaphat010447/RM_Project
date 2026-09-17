from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0005_add_weight_path_and_active_log'),
    ]

    operations = [
        TrigramExtension(),
        migrations.AddIndex(
            model_name='manga',
            index=GinIndex(
                fields=['genre'],
                name='manga_genre_trgm_idx',
                opclasses=['gin_trgm_ops'],
            ),
        ),
    ]