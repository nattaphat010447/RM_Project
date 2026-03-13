import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rentals.models import Manga, MangaCopy

mangas = [
    {"title": "One Piece Vol. 1", "author": "Eiichiro Oda", "genre": "Action/Adventure", "cover_image_url": "/images/mangas/one_piece_1.jpg", "price": 15.00},
    {"title": "Demon Slayer: Kimetsu no Yaiba Vol. 1", "author": "Koyoharu Gotouge", "genre": "Action/Fantasy", "cover_image_url": "/images/mangas/demon_slayer_1.jpg", "price": 12.00},
    {"title": "Attack on Titan Vol. 1", "author": "Hajime Isayama", "genre": "Action/Dark Fantasy", "cover_image_url": "/images/mangas/attack_on_titan_1.jpg", "price": 18.00},
    {"title": "Jujutsu Kaisen Vol. 1", "author": "Gege Akutami", "genre": "Action/Supernatural", "cover_image_url": "/images/mangas/jujutsu_kaisen_1.jpg", "price": 14.50},
    {"title": "Spy x Family Vol. 1", "author": "Tatsuya Endo", "genre": "Comedy/Action", "cover_image_url": "/images/mangas/spy_x_family_1.jpg", "price": 13.00}
]

copies = [
    ['OP-001-A', 'OP-001-B', 'OP-001-C'],
    ['DS-002-A', 'DS-002-B', 'DS-002-C'],
    ['AOT-003-A', 'AOT-003-B', 'AOT-003-C'],
    ['JK-004-A', 'JK-004-B', 'JK-004-C'],
    ['SF-005-A', 'SF-005-B', 'SF-005-C']
]

for i, data in enumerate(mangas):
    manga, created = Manga.objects.get_or_create(
        title=data['title'],
        defaults={
            'author': data['author'],
            'genre': data['genre'],
            'cover_image_url': data['cover_image_url'],
            'rental_price_per_day': data['price']
        }
    )

    for serial in copies[i]:
        MangaCopy.objects.get_or_create(
            manga=manga,
            serial_no=serial,
            defaults={'status': 'AVAILABLE'}
        )