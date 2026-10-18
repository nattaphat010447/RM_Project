"""
seed_example_user management command

Creates example_user01 — a realistic returning customer with:
  - Preferences set (4 manga)
  - 3 completed rental orders (returned)
  - 1 active rental (checked out)
  - 1 cancelled order
  - Reviews on rented manga
  - UserBehaviorLog entries (clicks, cart adds, rents)
  - A cart with items currently browsing

Profile:
  example_user01 is a 20-something reader who likes action/adventure
  with psychological depth. Has been using the site for a few months.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from datetime import timedelta
import random


class Command(BaseCommand):
    help = 'Seed example_user01 with realistic rental history'

    def handle(self, *args, **kwargs):
        from rentals.models import (
            Manga, MangaCopy, Cart, CartItem,
            RentalOrder, RentalOrderItem, MangaReview,
            UserPreference, UserBehaviorLog, User
        )

        self.stdout.write('Creating example_user01...')

        # --- User ---
        user, created = User.objects.get_or_create(
            username='example_user01',
            defaults={
                'email': 'example_user01@example.com',
                'password': make_password('password123'),
                'first_name': 'Tanaka',
                'last_name': 'Mira',
                'is_active': True,
                'is_staff': False,
            }
        )
        if not created:
            self.stdout.write('  example_user01 already exists, updating history...')

        now = timezone.now()

        # ── helpers ──────────────────────────────────────────────────────────
        def get_copy(manga_id, fallback_status='AVAILABLE'):
            """Return an AVAILABLE copy of this manga, or any copy if none free."""
            copy = MangaCopy.objects.filter(manga_id=manga_id, status='AVAILABLE').first()
            if not copy:
                copy = MangaCopy.objects.filter(manga_id=manga_id).first()
            return copy

        def manga(pk):
            try:
                return Manga.objects.get(pk=pk)
            except Manga.DoesNotExist:
                return None

        # ── Clear old seeded data so re-running is idempotent ─────────────────
        old_orders = RentalOrder.objects.filter(user=user)
        for order in old_orders:
            # restore any RENTED copies back to AVAILABLE before deleting
            for item in order.items.all():
                if item.manga_copy and item.manga_copy.status == 'RENTED':
                    item.manga_copy.status = 'AVAILABLE'
                    item.manga_copy.save()
        old_orders.delete()
        UserPreference.objects.filter(user=user).delete()
        MangaReview.objects.filter(user=user).delete()
        UserBehaviorLog.objects.filter(user=user).delete()
        Cart.objects.filter(user=user).delete()

        # ─────────────────────────────────────────────────────────────────────
        # PREFERENCES  (4 manga the user told us they like during onboarding)
        # Profile: Action + psychological/dark themes
        #   id=77 Attack on Titan, id=80 Tokyo Ghoul,
        #   id=5  Berserk,          id=58 Banana Fish
        # ─────────────────────────────────────────────────────────────────────
        pref_ids = [77, 80, 5, 58]
        for order_idx, mid in enumerate(pref_ids, 1):
            m = manga(mid)
            if m:
                UserPreference.objects.create(user=user, manga=m, order=order_idx)
        self.stdout.write('  Preferences set: Attack on Titan, Tokyo Ghoul, Berserk, Banana Fish')

        # ─────────────────────────────────────────────────────────────────────
        # ORDER 1 — Completed 2 months ago
        #   Rented: Chainsaw Man (id=25), Dorohedoro (id=60)
        #   Both RETURNED, no fine
        # ─────────────────────────────────────────────────────────────────────
        order1_manga = [25, 60]
        copies1 = [get_copy(mid) for mid in order1_manga if get_copy(mid)]
        if len(copies1) == len(order1_manga):
            requested1 = now - timedelta(days=65, hours=6)
            approved1 = now - timedelta(days=64, hours=20)
            checked_out1 = now - timedelta(days=64, hours=19)
            returned1 = now - timedelta(days=57, hours=19)

            order1 = RentalOrder.objects.create(
                user=user,
                status='RETURNED',
                total_rent_fee=sum(c.manga.rental_price_per_day * 7 for c in copies1),
                total_fine=0,
                requested_at=requested1,
                approved_at=approved1,
                checked_out_at=checked_out1,
                returned_at=returned1,
            )
            for copy in copies1:
                RentalOrderItem.objects.create(
                    order=order1,
                    manga_copy=copy,
                    rent_price_per_day=copy.manga.rental_price_per_day,
                    rent_days=7,
                    item_status='RETURNED',
                    active_flag=False,
                    rental_date=checked_out1.date(),
                    due_at=checked_out1 + timedelta(days=7),
                    returned_at=returned1,
                )
            self.stdout.write('  Order 1 created (RETURNED): Chainsaw Man, Dorohedoro')
        else:
            self.stdout.write('  Warning: Order 1 skipped — missing copies')

        # ─────────────────────────────────────────────────────────────────────
        # ORDER 2 — Completed 5 weeks ago
        #   Rented: Vinland Saga (id=21), Land of the Lustrous (id=84),
        #           Pandora Hearts (id=65)
        #   All RETURNED, 1 day late fine on Vinland Saga
        # ─────────────────────────────────────────────────────────────────────
        from rentals.models import FineLog
        order2_manga = [21, 84, 65]
        copies2 = [get_copy(mid) for mid in order2_manga if get_copy(mid)]
        if len(copies2) == len(order2_manga):
            requested2 = now - timedelta(days=38, hours=6)
            approved2 = now - timedelta(days=37, hours=20)
            checked_out2 = now - timedelta(days=37, hours=18)
            due2 = now - timedelta(days=30, hours=18)
            returned2 = now - timedelta(days=29, hours=18)  # 1 day late

            fine_amount = copies2[0].manga.rental_price_per_day * 2  # 2x daily rate per late day

            order2 = RentalOrder.objects.create(
                user=user,
                status='RETURNED',
                total_rent_fee=sum(c.manga.rental_price_per_day * 7 for c in copies2),
                total_fine=fine_amount,
                requested_at=requested2,
                approved_at=approved2,
                checked_out_at=checked_out2,
                returned_at=returned2,
            )
            for i, copy in enumerate(copies2):
                RentalOrderItem.objects.create(
                    order=order2,
                    manga_copy=copy,
                    rent_price_per_day=copy.manga.rental_price_per_day,
                    rent_days=7,
                    item_status='RETURNED',
                    active_flag=False,
                    rental_date=checked_out2.date(),
                    due_at=due2,
                    returned_at=returned2,
                )
            # Fine for late return of Vinland Saga
            fine_item = order2.items.filter(manga_copy=copies2[0]).first()
            if fine_item:
                FineLog.objects.create(
                    order_item=fine_item,
                    user=user,
                    fine_type='LATE',
                    amount=fine_amount,
                    created_at=returned2,
                )
            self.stdout.write('  Order 2 created (RETURNED, 1-day late fine on Vinland Saga)')
        else:
            self.stdout.write('  Warning: Order 2 skipped — missing copies')

        # ─────────────────────────────────────────────────────────────────────
        # ORDER 3 — Completed 3 weeks ago
        #   Rented: Golden Kamuy (id=95), Delicious in Dungeon (id=91)
        #   RETURNED on time
        # ─────────────────────────────────────────────────────────────────────
        order3_manga = [95, 91]
        copies3 = [get_copy(mid) for mid in order3_manga if get_copy(mid)]
        if len(copies3) == len(order3_manga):
            requested3 = now - timedelta(days=22, hours=6)
            approved3 = now - timedelta(days=21, hours=22)
            checked_out3 = now - timedelta(days=21, hours=21)
            returned3 = now - timedelta(days=16, hours=21)

            order3 = RentalOrder.objects.create(
                user=user,
                status='RETURNED',
                total_rent_fee=sum(c.manga.rental_price_per_day * 5 for c in copies3),
                total_fine=0,
                requested_at=requested3,
                approved_at=approved3,
                checked_out_at=checked_out3,
                returned_at=returned3,
            )
            for copy in copies3:
                RentalOrderItem.objects.create(
                    order=order3,
                    manga_copy=copy,
                    rent_price_per_day=copy.manga.rental_price_per_day,
                    rent_days=5,
                    item_status='RETURNED',
                    active_flag=False,
                    rental_date=checked_out3.date(),
                    due_at=checked_out3 + timedelta(days=5),
                    returned_at=returned3,
                )
            self.stdout.write('  Order 3 created (RETURNED): Golden Kamuy, Delicious in Dungeon')
        else:
            self.stdout.write('  Warning: Order 3 skipped — missing copies')

        # ─────────────────────────────────────────────────────────────────────
        # ORDER 4 — Currently CHECKED_OUT (active)
        #   Rented: Frieren (id=36), Witch Hat Atelier (id=101)
        #   Checked out 3 days ago, due in 4 days
        # ─────────────────────────────────────────────────────────────────────
        order4_manga = [36, 101]
        copies4 = [get_copy(mid) for mid in order4_manga if get_copy(mid)]
        if len(copies4) == len(order4_manga):
            requested4 = now - timedelta(days=4, hours=8)
            approved4 = now - timedelta(days=4, hours=4)
            checked_out4 = now - timedelta(days=3)
            due4 = now + timedelta(days=4)

            order4 = RentalOrder.objects.create(
                user=user,
                status='CHECKED_OUT',
                total_rent_fee=sum(c.manga.rental_price_per_day * 7 for c in copies4),
                total_fine=0,
                requested_at=requested4,
                approved_at=approved4,
                checked_out_at=checked_out4,
            )
            for copy in copies4:
                copy.status = 'RENTED'
                copy.save()
                RentalOrderItem.objects.create(
                    order=order4,
                    manga_copy=copy,
                    rent_price_per_day=copy.manga.rental_price_per_day,
                    rent_days=7,
                    item_status='CHECKED_OUT',
                    active_flag=True,
                    rental_date=checked_out4.date(),
                    due_at=due4,
                )
            self.stdout.write('  Order 4 created (CHECKED_OUT, active): Frieren, Witch Hat Atelier')
        else:
            self.stdout.write('  Warning: Order 4 skipped — missing copies')

        # ─────────────────────────────────────────────────────────────────────
        # ORDER 5 — CANCELLED (changed mind 10 days ago, never approved)
        #   Requested: Haikyu!! (id=82)
        # ─────────────────────────────────────────────────────────────────────
        cancelled_copy = get_copy(82)
        if cancelled_copy:
            requested5 = now - timedelta(days=10, hours=6)
            order5 = RentalOrder.objects.create(
                user=user,
                status='CANCELLED',
                total_rent_fee=0,
                total_fine=0,
                requested_at=requested5,
            )
            RentalOrderItem.objects.create(
                order=order5,
                manga_copy=cancelled_copy,
                rent_price_per_day=cancelled_copy.manga.rental_price_per_day,
                rent_days=7,
                item_status='CANCELLED',
                active_flag=False,
                rental_date=requested5.date(),
                due_at=requested5 + timedelta(days=7),
            )
            self.stdout.write('  Order 5 created (CANCELLED): Haikyu!!')

        # Fix requested_at for all orders (computed dates end up as now() due to
        # ORM save timing — patch them explicitly after creation)
        all_orders = list(RentalOrder.objects.filter(user=user).order_by('checked_out_at'))
        returned_orders = [o for o in all_orders if o.status == 'RETURNED']
        checked_orders  = [o for o in all_orders if o.status == 'CHECKED_OUT']
        cancelled_orders = [o for o in all_orders if o.status == 'CANCELLED']
        req_patches = (
            [(returned_orders[i], now - timedelta(days=d, hours=6)) for i, d in enumerate([65, 38, 22])] +
            [(checked_orders[0],  now - timedelta(days=4, hours=8))] +
            [(cancelled_orders[0], now - timedelta(days=10, hours=6))]
        ) if (len(returned_orders) >= 3 and checked_orders and cancelled_orders) else []
        for order, req_dt in req_patches:
            order.requested_at = req_dt
            order.save(update_fields=['requested_at'])

        # ─────────────────────────────────────────────────────────────────────
        # ─────────────────────────────────────────────────────────────────────
        reviews = [
            (25, 5),   # Chainsaw Man — loved it
            (60, 5),   # Dorohedoro — loved it
            (21, 4),   # Vinland Saga — great but returned late
            (84, 5),   # Land of the Lustrous
            (65, 4),   # Pandora Hearts
            (95, 5),   # Golden Kamuy
            (91, 4),   # Delicious in Dungeon
        ]
        for mid, rating in reviews:
            m = manga(mid)
            if m:
                MangaReview.objects.get_or_create(
                    user=user, manga=m,
                    defaults={'rating': rating, 'created_at': now - timedelta(days=random.randint(3, 60))}
                )
        self.stdout.write('  Reviews created (7 manga rated)')

        # ─────────────────────────────────────────────────────────────────────
        # BEHAVIOR LOGS — realistic browsing session history
        # ─────────────────────────────────────────────────────────────────────
        behavior_entries = [
            # Session 1 — 65 days ago, browsed and rented Chainsaw Man + Dorohedoro
            (25, 'CLICK',    'BROWSE',         now - timedelta(days=65, hours=2)),
            (60, 'CLICK',    'BROWSE',         now - timedelta(days=65, hours=2)),
            (25, 'ADD_CART', 'BROWSE',         now - timedelta(days=65, hours=1)),
            (60, 'ADD_CART', 'BROWSE',         now - timedelta(days=65, hours=1)),
            (25, 'RENT',     'BROWSE',         now - timedelta(days=65)),
            (60, 'RENT',     'BROWSE',         now - timedelta(days=65)),
            # Session 2 — 38 days ago, search + rent Vinland Saga etc.
            (21, 'CLICK',    'SEARCH',         now - timedelta(days=38, hours=3)),
            (84, 'CLICK',    'SEARCH',         now - timedelta(days=38, hours=3)),
            (65, 'CLICK',    'RECOMMENDATION', now - timedelta(days=38, hours=2)),
            (21, 'ADD_CART', 'SEARCH',         now - timedelta(days=38, hours=2)),
            (84, 'ADD_CART', 'SEARCH',         now - timedelta(days=38, hours=2)),
            (65, 'ADD_CART', 'RECOMMENDATION', now - timedelta(days=38, hours=1)),
            (21, 'RENT',     'SEARCH',         now - timedelta(days=38)),
            (84, 'RENT',     'SEARCH',         now - timedelta(days=38)),
            (65, 'RENT',     'RECOMMENDATION', now - timedelta(days=38)),
            # Session 3 — 22 days ago, clicked on For You recs
            (95, 'CLICK',    'RECOMMENDATION', now - timedelta(days=22, hours=1)),
            (91, 'CLICK',    'RECOMMENDATION', now - timedelta(days=22, hours=1)),
            (95, 'ADD_CART', 'RECOMMENDATION', now - timedelta(days=22)),
            (91, 'ADD_CART', 'RECOMMENDATION', now - timedelta(days=22)),
            (95, 'RENT',     'RECOMMENDATION', now - timedelta(days=22)),
            (91, 'RENT',     'RECOMMENDATION', now - timedelta(days=22)),
            # Session 4 — 4 days ago, browsed then rented Frieren + Witch Hat
            (36,  'CLICK',    'BROWSE',         now - timedelta(days=4, hours=5)),
            (101, 'CLICK',    'BROWSE',         now - timedelta(days=4, hours=5)),
            (77,  'CLICK',    'RECOMMENDATION', now - timedelta(days=4, hours=4)),  # just browsed
            (36,  'ADD_CART', 'BROWSE',         now - timedelta(days=4, hours=3)),
            (101, 'ADD_CART', 'BROWSE',         now - timedelta(days=4, hours=3)),
            (36,  'RENT',     'BROWSE',         now - timedelta(days=4, hours=2)),
            (101, 'RENT',     'BROWSE',         now - timedelta(days=4, hours=2)),
        ]
        for mid, event, source, ts in behavior_entries:
            m = manga(mid)
            if m:
                UserBehaviorLog.objects.create(
                    user=user, manga=m, event_type=event, source=source, created_at=ts
                )
        self.stdout.write('  Behavior logs created (28 events across 4 sessions)')

        # ─────────────────────────────────────────────────────────────────────
        # CURRENT CART — browsing right now, considering next rental
        #   Has: Pluto (id=57), Banana Fish (id=58) in cart
        # ─────────────────────────────────────────────────────────────────────
        cart = Cart.objects.create(user=user)
        cart_items = [57, 58]
        for mid in cart_items:
            copy = get_copy(mid)
            if copy:
                CartItem.objects.create(cart=cart, manga_copy=copy, rent_days=7)
        self.stdout.write('  Cart created with: Pluto, Banana Fish')

        # ─────────────────────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS(
            '\n✓ example_user01 seeded successfully.\n'
            '  Username: example_user01\n'
            '  Password: password123\n'
            '  Profile: Action/dark-fantasy reader\n'
            '  Orders: 3 returned, 1 active (Frieren + Witch Hat), 1 cancelled\n'
            '  Reviews: 7 ratings\n'
            '  Behavior logs: 28 events\n'
            '  Cart: 2 items (Pluto, Banana Fish)\n'
        ))
