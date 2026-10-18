import os
from django.apps import AppConfig


class RentalsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rentals'

    def ready(self):
        if os.environ.get('RUN_MAIN', None) == 'true':
            from . import scheduler
            scheduler.start_scheduler()

            # Auto-sync mbrs_id for manga without one (on server start)
            self._auto_sync_mbrs_ids()

    def _auto_sync_mbrs_ids(self):
        """Run mbrs_id sync for manga without one, silently in background."""
        import threading

        def sync_task():
            try:
                from .models import Manga
                from .mbrs_sync import sync_mbrs_id_for_manga
                import logging
                logger = logging.getLogger(__name__)

                mangas = Manga.objects.filter(mbrs_id__isnull=True, is_active=True)
                count = mangas.count()

                if count == 0:
                    return

                logger.info(f"Auto-syncing mbrs_id for {count} manga...")
                synced = 0
                for manga in mangas:
                    if sync_mbrs_id_for_manga(manga):
                        synced += 1

                logger.info(f"Successfully synced {synced}/{count} manga")
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"mbrs_id auto-sync failed: {e}")

        # Run in background thread to not block server startup
        thread = threading.Thread(target=sync_task, daemon=True)
        thread.start()
