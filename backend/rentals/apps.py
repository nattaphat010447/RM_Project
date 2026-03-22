import os
from django.apps import AppConfig


class RentalsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rentals'

    def ready(self):
        if os.environ.get('RUN_MAIN', None) == 'true':
            from . import scheduler
            scheduler.start_scheduler()
