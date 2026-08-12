import os
import django
import pandas as pd
from thefuzz import process, fuzz

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from rentals.recommender import RecommenderService
from rentals.models import Manga, RentalOrderItem

User = get_user_model()

def load_csv_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, 'rentals', 'ml_models', 'Anime.csv')
    try:
        df = pd.read_csv(csv_path)
        df['display_name'] = df['title_english'].fillna(df['name'])
        
        csv_mapping = dict(zip(df['anime_id'], df['display_name']))
        mal_titles = df['display_name'].dropna().tolist()
        title_to_id = dict(zip(df['display_name'], df['anime_id']))
        
        return csv_mapping, mal_titles, title_to_id
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการโหลดไฟล์ข้อมูล: {e}")
        return {}, [], {}

def print_recommendations(recommended_ids, csv_mapping):
    if not recommended_ids:
        print("ไม่พบรายการแนะนำในระบบ")
        return

    all_matches = Manga.objects.filter(mbrs_id__in=recommended_ids, is_active=True)
    manga_dict = {m.mbrs_id: m.title for m in all_matches}

    print("\nรายการมังงะที่ระบบแนะนำ (10 อันดับ):")
    for rank, mbrs_id in enumerate(recommended_ids[:10], 1):
        if mbrs_id in manga_dict:
            title = manga_dict[mbrs_id]
            print(f"  {rank:02d}. [รหัส: {mbrs_id}] {title}")
        else:
            csv_title = csv_mapping.get(mbrs_id, "ไม่พบข้อมูลชื่อเรื่อง")
            print(f"  {rank:02d}. [รหัส: {mbrs_id}] (ไม่มีข้อมูลในฐานข้อมูล: {csv_title})")

def sandbox_mode(service, csv_mapping, mal_titles, title_to_id):
    print("\n" + "="*60)
    print("ระบบจำลองการทำงานอิสระ")
    print("="*60)

    custom_history = []
    
    while True:
        query = input("\nระบุชื่อมังงะภาษาอังกฤษ (พิมพ์ 'done' เพื่อประมวลผล, 'cancel' เพื่อยกเลิก): ").strip()
        
        if query.lower() == 'cancel':
            return
        if query.lower() == 'done':
            break
        if not query:
            continue
            
        best_match, score = process.extractOne(query, mal_titles, scorer=fuzz.token_set_ratio)
        
        if score > 65:
            confirm = input(f"พบข้อมูลใกล้เคียง: '{best_match}' ยืนยันหรือไม่ (y/n): ").strip().lower()
            if confirm in ('', 'y'):
                m_id = title_to_id[best_match]
                if m_id not in custom_history:
                    custom_history.append(m_id)
                    print(f"บันทึกข้อมูลเรียบร้อย (จำนวนรายการปัจจุบัน: {len(custom_history)})")
                else:
                    print("มีข้อมูลนี้ในระบบแล้ว")
        else:
            print("ไม่พบข้อมูลที่ตรงกับเงื่อนไข กรุณาระบุข้อมูลใหม่")

    if not custom_history:
        print("ไม่มีข้อมูลสำหรับการประมวลผล")
        return
        
    print(f"\nระบบกำลังประมวลผลข้อมูลจากประวัติจำลองจำนวน {len(custom_history)} รายการ")
    recommended_ids = service.get_item_based_recommendations(custom_history)
    print("\nรูปแบบการวิเคราะห์: โหมดจำลองอิสระ")
    print_recommendations(recommended_ids, csv_mapping)

def run_tester():
    print("\n" + "="*60)
    print("ระบบทดสอบการทำงาน MBRS")
    print("="*60)

    print("กำลังเตรียมความพร้อมของระบบ...")
    service = RecommenderService()
    csv_mapping, mal_titles, title_to_id = load_csv_data()

    while True:
        print("\n" + "-"*60)
        print("รายการคำสั่งที่รองรับ:")
        print("  - พิมพ์ [ชื่อผู้ใช้งาน] : เพื่อตรวจสอบรายการแนะนำ")
        print("  - พิมพ์ 'list' : เพื่อแสดงรายชื่อผู้ใช้งานล่าสุด")
        print("  - พิมพ์ 'free' : เพื่อเข้าสู่ระบบจำลองการทำงานอิสระ")
        print("  - พิมพ์ 'exit' : เพื่อสิ้นสุดการทำงาน")
        
        search_query = input("ระบุคำสั่ง: ").strip()

        if search_query.lower() == 'exit':
            print("สิ้นสุดการทำงานของระบบ")
            break
            
        if search_query.lower() == 'free':
            sandbox_mode(service, csv_mapping, mal_titles, title_to_id)
            continue

        if search_query.lower() == 'list':
            recent_users = User.objects.filter(is_active=True).order_by('-date_joined')[:15]
            print("\nรายชื่อผู้ใช้งานล่าสุด:")
            for u in recent_users:
                print(f"  - {u.username} (รหัส: {u.id})")
            continue

        if not search_query:
            continue

        try:
            target_user = User.objects.get(username__iexact=search_query)
        except User.DoesNotExist:
            print("ไม่พบข้อมูลผู้ใช้งานในระบบ")
            continue

        print(f"\nกำลังวิเคราะห์ข้อมูลผู้ใช้งาน: {target_user.username}")
        past_rentals = RentalOrderItem.objects.filter(
            order__user=target_user
        ).values_list('manga_copy__manga__mbrs_id', 'manga_copy__manga__title').distinct()

        valid_past_ids = [m[0] for m in past_rentals if m[0] is not None]

        print(f"ข้อมูลประวัติการทำรายการ (จำนวน {len(valid_past_ids)} รายการ):")
        if not past_rentals:
            print("  - ไม่พบข้อมูลประวัติ")
        for m_id, m_title in past_rentals:
            if m_id:
                print(f"  - [รหัส: {m_id}] {m_title}")
            else:
                print(f"  - [ไม่ระบุรหัส] {m_title} (ยกเว้นการประมวลผล)")

        recommendation_type = "ประมวลผลอ้างอิงจากข้อมูลผู้ใช้งาน"
        recommended_ids = service.get_recommendations(target_user.username)

        if not recommended_ids:
            if valid_past_ids:
                recommendation_type = "ประมวลผลอ้างอิงจากประวัติรายการ"
                recommended_ids = service.get_item_based_recommendations(valid_past_ids)
            else:
                recommendation_type = "ไม่พบประวัติข้อมูล (ดำเนินการนำเสนอรายการใหม่)"
                recommended_ids = []

        print(f"\nรูปแบบการวิเคราะห์: {recommendation_type}")
        if recommended_ids:
            print_recommendations(recommended_ids, csv_mapping)
        else:
            print("รายการนำเสนอล่าสุดจากฐานข้อมูล:")
            latest_mangas = Manga.objects.filter(is_active=True).order_by('-created_at')[:10]
            for rank, m in enumerate(latest_mangas, 1):
                print(f"  {rank:02d}. [รหัส: {m.id}] {m.title}")

if __name__ == "__main__":
    run_tester()