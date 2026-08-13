from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from rentals.models import RentalOrderItem, MangaCopy

class Command(BaseCommand):
    help = 'Scan items overdue by 90+ days and mark them as LOST'

    def handle(self, *args, **kwargs):
        ninety_days_ago = timezone.now() - timedelta(days=90)

        overdue_items = RentalOrderItem.objects.filter(
            item_status='CHECKED_OUT',
            due_at__lte=ninety_days_ago
        )

        count = 0
        for item in overdue_items:
            item.item_status = 'LOST'
            item.save()

            copy = item.manga_copy
            copy.status = 'LOST'
            copy.save()
            
            count += 1
            self.stdout.write(self.style.WARNING(f'Marked as LOST: Order {item.order.id} - Copy {copy.serial_no}'))

        if count > 0:
            self.stdout.write(self.style.SUCCESS(f'Marked {count} overdue item(s) as LOST'))
        else:
            self.stdout.write(self.style.SUCCESS('No items overdue by more than 90 days'))