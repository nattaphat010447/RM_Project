from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from rentals.models import RentalOrderItem, MangaCopy

class Command(BaseCommand):
    help = 'สแกนหาหนังสือที่เลยกำหนดคืน 90 วันและเปลี่ยนสถานะเป็น LOST'

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
            self.stdout.write(self.style.SUCCESS(f'อัปเดตสถานะหนังสือสูญหายสำเร็จจำนวน {count} รายการ'))
        else:
            self.stdout.write(self.style.SUCCESS('ไม่มีหนังสือที่ค้างคืนเกิน 90 วัน'))