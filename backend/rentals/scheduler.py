from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from datetime import timedelta
from rentals.models import RentalOrderItem, MangaCopy
import sys

def update_lost_items_task():
    try:
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

        if count > 0:
            print(f"[Scheduler] อัปเดตหนังสือสูญหายสำเร็จ {count} รายการ", flush=True)
            
    except Exception as e:
        print(f"[Scheduler] Error: {str(e)}", flush=True)


def start_scheduler():
    scheduler = BackgroundScheduler()
    
    scheduler.add_job(update_lost_items_task, 'cron', hour=0, minute=0)
    
    scheduler.start()
    
    print("[Scheduler] ระบบตั้งเวลาอัตโนมัติเริ่มทำงานแล้ว...", flush=True)