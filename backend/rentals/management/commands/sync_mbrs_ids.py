"""
Django management command to sync mbrs_id for all manga that don't have one yet.
Runs automatically after migrations via AppConfig.ready()
"""
from django.core.management.base import BaseCommand
from rentals.models import Manga
from rentals.mbrs_sync import sync_mbrs_id_for_manga


class Command(BaseCommand):
    help = 'Sync mbrs_id for manga without one'

    def handle(self, *args, **options):
        mangas = Manga.objects.filter(mbrs_id__isnull=True, is_active=True)
        count = mangas.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('All manga already have mbrs_id'))
            return

        self.stdout.write(f'Syncing mbrs_id for {count} manga...')

        synced = 0
        for manga in mangas:
            if sync_mbrs_id_for_manga(manga):
                synced += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully synced {synced}/{count} manga'))
