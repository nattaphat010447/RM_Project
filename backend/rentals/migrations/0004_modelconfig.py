from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0003_manga_description'),
    ]

    operations = [
        migrations.CreateModel(
            name='ModelConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('active_version', models.CharField(
                    choices=[('v1', 'MB-CGCN v1 (CART+RENT)'), ('v2', 'MB-CGCN v2 (CLICK+CART+RENT)')],
                    default='v2',
                    max_length=10,
                )),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'verbose_name': 'Model Config'},
        ),
    ]
