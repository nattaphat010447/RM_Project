import os
import django

# 1. Setup Django Environment ให้คุยกับ Database ได้
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rentals.recommender import RecommenderService
from rentals.models import Manga

def run_tester():
    print("\n" + "="*50)
    print("🤖 MBRS Model Interactive Tester 🤖")
    print("="*50)

    # โหลด Service (สมองของ AI)
    service = RecommenderService()
    
    # ดึงตัวอย่างชื่อ User ที่มีอยู่ในโมเดลมาโชว์สัก 10 คน จะได้ไม่ต้องเดา
    sample_users = list(service.user_mapping.keys())[:10]
    print(f"\n💡 ตัวอย่าง Username ที่โมเดลรู้จัก: {', '.join(sample_users)}")

    while True:
        # รับค่า Username จากคีย์บอร์ด
        username = input("\n👤 พิมพ์ Username ที่ต้องการทดสอบ (พิมพ์ 'exit' เพื่อออก): ").strip()
        
        if username.lower() == 'exit':
            print("👋 จบการทดสอบ")
            break
            
        if not username:
            continue

        # ให้โมเดลทำนาย
        recommended_ids = service.get_recommendations(username)

        # ถ้าส่งกลับมาเป็น List ว่าง แปลว่าไม่รู้จัก (Cold Start)
        if not recommended_ids:
            print(f"⚠️ ไม่พบประวัติของ '{username}' ในโมเดล (ระบบจะใช้หน้ามังงะล่าสุดแทน)")
            continue

        print(f"\n🎯 มังงะที่ MBRS แนะนำสำหรับคุณ '{username}':")
        
        # ไปดึงชื่อเรื่องจาก Database ของเรา โดยอิงจาก mbrs_id
        mangas_in_db = Manga.objects.filter(mbrs_id__in=recommended_ids, is_active=True)
        manga_dict = {m.mbrs_id: m.title for m in mangas_in_db}

        # วนลูปแสดงผลลัพธ์
        for rank, mbrs_id in enumerate(recommended_ids, 1):
            # ถ้าหาชื่อใน DB ร้านเราไม่เจอ ให้บอกว่า "ไม่มีในร้าน"
            title = manga_dict.get(mbrs_id, f"❌ (มีใน Dataset แต่ยังไม่มีในร้านเรา)")
            print(f"  {rank:02d}. [MBRS_ID: {mbrs_id}] {title}")

if __name__ == "__main__":
    run_tester()