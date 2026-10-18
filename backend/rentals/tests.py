"""
API tests for the manga rental backend.

Run against PostgreSQL (the GIN trigram index needs pg_trgm):
    python manage.py test rentals
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    ABTestAssignment, ABTestEvent, ABTestVariant, Cart, CartItem, FineLog, Manga, MangaCopy,
    MangaReview, ModelConfig, ModelTrainingLog, RentalOrder, RentalOrderItem, UserBehaviorLog,
    UserPreference,
)

User = get_user_model()


def make_manga(title='Monster', price='19.00', copies=2, genre='Drama, Mystery', **extra):
    manga = Manga.objects.create(title=title, author='Naoki Urasawa', genre=genre,
                                 rental_price_per_day=Decimal(price), **extra)
    for i in range(copies):
        MangaCopy.objects.create(manga=manga, serial_no=f'{title[:3].upper()}-{manga.id}-{i + 1}')
    return manga


class BaseAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='reader', password='pass12345!', email='r@example.com')
        Cart.objects.create(user=self.user)
        self.admin = User.objects.create_user(username='staff', password='pass12345!', is_staff=True)
        self.manga = make_manga()

    def login(self, user=None):
        self.client.force_authenticate(user or self.user)

    def rent_and_return(self, user=None, manga=None):
        """Create a RETURNED rental for user/manga directly (setup helper)."""
        user = user or self.user
        manga = manga or self.manga
        copy = manga.copies.first()
        order = RentalOrder.objects.create(user=user, status=RentalOrder.Status.RETURNED,
                                           total_rent_fee=manga.rental_price_per_day * 3)
        return RentalOrderItem.objects.create(order=order, manga_copy=copy, rent_price_per_day=manga.rental_price_per_day,
                                              rent_days=3, item_status=RentalOrderItem.ItemStatus.RETURNED,
                                              returned_at=timezone.now())


class AuthTests(BaseAPITest):
    def test_register_creates_customer_with_cart(self):
        res = self.client.post('/api/register/', {
            'username': 'newbie', 'email': 'n@example.com', 'password': 'Secret123!',
            'first_name': 'New', 'last_name': 'User', 'phone': '0812345678', 'address': 'KKU',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(username='newbie')
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertTrue(user.check_password('Secret123!'))
        self.assertTrue(Cart.objects.filter(user=user).exists())

    def test_register_duplicate_username(self):
        res = self.client.post('/api/register/', {'username': 'reader', 'password': 'x'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('username', res.data)

    def test_token_obtain_and_refresh(self):
        res = self.client.post('/api/token/', {'username': 'reader', 'password': 'pass12345!'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)
        refresh = self.client.post('/api/token/refresh/', {'refresh': res.data['refresh']}, format='json')
        self.assertEqual(refresh.status_code, 200)
        self.assertIn('access', refresh.data)

    def test_token_wrong_password(self):
        res = self.client.post('/api/token/', {'username': 'reader', 'password': 'wrong'}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_me_returns_role(self):
        self.login(self.admin)
        res = self.client.get('/api/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['role'], 'ADMIN')

    def test_staff_flag_syncs_role(self):
        self.admin.is_staff = False
        self.admin.save()
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.role, User.Role.CUSTOMER)

    def test_profile_get_and_update(self):
        self.login()
        res = self.client.get('/api/users/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'reader')
        res = self.client.put('/api/users/profile/', {'first_name': 'Mira', 'password': 'NewPass123!',
                                                      'username': 'hacker'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Mira')
        self.assertEqual(self.user.username, 'reader')  # read-only field ignored
        self.assertTrue(self.user.check_password('NewPass123!'))

    def test_protected_endpoints_require_token(self):
        for path in ('/api/cart/', '/api/orders/', '/api/recommendations/', '/api/preferences/', '/api/me/'):
            self.assertEqual(self.client.get(path).status_code, 401, path)


class MangaCatalogTests(BaseAPITest):
    def test_list_only_active(self):
        make_manga('Hidden', is_active=False)
        res = self.client.get('/api/mangas/')
        self.assertEqual(res.status_code, 200)
        titles = [m['title'] for m in res.data]
        self.assertIn('Monster', titles)
        self.assertNotIn('Hidden', titles)

    def test_detail_fields(self):
        res = self.client.get(f'/api/mangas/{self.manga.id}/')
        self.assertEqual(res.status_code, 200)
        for key in ('available_copies', 'copies', 'avg_rating', 'rating_count', 'sold_count'):
            self.assertIn(key, res.data)
        self.assertEqual(res.data['available_copies'], 2)
        self.assertEqual(res.data['rating_count'], 0)

    def test_detail_inactive_404(self):
        hidden = make_manga('Hidden', is_active=False)
        self.assertEqual(self.client.get(f'/api/mangas/{hidden.id}/').status_code, 404)

    def test_popular_orders_by_completed_rentals(self):
        other = make_manga('Berserk')
        self.rent_and_return(manga=other)
        self.rent_and_return(manga=other)
        res = self.client.get('/api/mangas/popular/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data[0]['title'], 'Berserk')


class CartTests(BaseAPITest):
    def test_add_view_remove(self):
        self.login()
        res = self.client.post(f'/api/cart/add/{self.manga.id}/', {'rent_days': 5}, format='json')
        self.assertEqual(res.status_code, 201)
        cart = self.client.get('/api/cart/')
        self.assertEqual(len(cart.data), 1)
        self.assertEqual(cart.data[0]['rent_days'], 5)
        item_id = cart.data[0]['id']
        self.assertEqual(self.client.delete(f'/api/cart/remove/{item_id}/').status_code, 200)
        self.assertEqual(len(self.client.get('/api/cart/').data), 0)

    def test_duplicate_manga_rejected(self):
        self.login()
        self.client.post(f'/api/cart/add/{self.manga.id}/', {}, format='json')
        res = self.client.post(f'/api/cart/add/{self.manga.id}/', {}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_invalid_rent_days(self):
        self.login()
        for days in (0, 'abc'):
            res = self.client.post(f'/api/cart/add/{self.manga.id}/', {'rent_days': days}, format='json')
            self.assertEqual(res.status_code, 400, days)

    def test_out_of_stock(self):
        self.manga.copies.update(status=MangaCopy.Status.RENTED)
        self.login()
        res = self.client.post(f'/api/cart/add/{self.manga.id}/', {}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_cannot_remove_other_users_item(self):
        other = User.objects.create_user(username='other', password='x')
        cart = Cart.objects.create(user=other)
        item = CartItem.objects.create(cart=cart, manga_copy=self.manga.copies.first())
        self.login()
        self.assertEqual(self.client.delete(f'/api/cart/remove/{item.id}/').status_code, 404)


class CheckoutAndOrderLifecycleTests(BaseAPITest):
    def checkout(self, days=3):
        self.login()
        self.client.post(f'/api/cart/add/{self.manga.id}/', {'rent_days': days}, format='json')
        return self.client.post('/api/cart/checkout/')

    def test_checkout_creates_requested_order_and_reserves(self):
        res = self.checkout(days=3)
        self.assertEqual(res.status_code, 201)
        order = RentalOrder.objects.get(id=res.data['order_id'])
        self.assertEqual(order.status, RentalOrder.Status.REQUESTED)
        self.assertEqual(order.total_rent_fee, Decimal('57.00'))
        item = order.items.get()
        self.assertEqual(item.manga_copy.status, MangaCopy.Status.RESERVED)
        self.assertFalse(CartItem.objects.filter(cart__user=self.user).exists())
        # RENT is logged on approval, not at checkout
        self.assertFalse(UserBehaviorLog.objects.filter(event_type='RENT').exists())

    def test_checkout_empty_cart(self):
        self.login()
        self.assertEqual(self.client.post('/api/cart/checkout/').status_code, 400)

    def test_checkout_conflict_when_copy_taken(self):
        self.login()
        self.client.post(f'/api/cart/add/{self.manga.id}/', {}, format='json')
        CartItem.objects.get(cart__user=self.user).manga_copy.__class__.objects.update(status=MangaCopy.Status.RENTED)
        res = self.client.post('/api/cart/checkout/')
        self.assertEqual(res.status_code, 409)
        self.assertFalse(RentalOrder.objects.exists())

    def test_cancel_requested_order(self):
        order_id = self.checkout().data['order_id']
        res = self.client.post(f'/api/orders/{order_id}/cancel/')
        self.assertEqual(res.status_code, 200)
        order = RentalOrder.objects.get(id=order_id)
        self.assertEqual(order.status, RentalOrder.Status.CANCELLED)
        self.assertEqual(order.items.get().manga_copy.status, MangaCopy.Status.AVAILABLE)

    def test_full_lifecycle_approve_checkout_return(self):
        order_id = self.checkout(days=2).data['order_id']
        self.login(self.admin)
        self.assertEqual(self.client.post(f'/api/admin/orders/{order_id}/approve/').status_code, 200)
        self.assertEqual(UserBehaviorLog.objects.filter(user=self.user, event_type='RENT').count(), 1)
        # cancelling an approved order is not allowed
        self.login()
        self.assertEqual(self.client.post(f'/api/orders/{order_id}/cancel/').status_code, 400)
        self.login(self.admin)
        self.assertEqual(self.client.post(f'/api/admin/orders/{order_id}/checkout/').status_code, 200)
        item = RentalOrderItem.objects.get(order_id=order_id)
        self.assertEqual(item.item_status, RentalOrderItem.ItemStatus.CHECKED_OUT)
        self.assertEqual(item.manga_copy.status, MangaCopy.Status.RENTED)
        self.assertAlmostEqual((item.due_at - item.rental_date).days, 2)
        res = self.client.post(f'/api/admin/orders/{order_id}/items/{item.id}/return/')
        self.assertEqual(res.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.item_status, RentalOrderItem.ItemStatus.RETURNED)
        self.assertEqual(item.manga_copy.status, MangaCopy.Status.AVAILABLE)
        self.assertEqual(RentalOrder.objects.get(id=order_id).status, RentalOrder.Status.RETURNED)

    def test_reject_releases_copy(self):
        order_id = self.checkout().data['order_id']
        self.login(self.admin)
        self.assertEqual(self.client.post(f'/api/admin/orders/{order_id}/reject/').status_code, 200)
        order = RentalOrder.objects.get(id=order_id)
        self.assertEqual(order.status, RentalOrder.Status.REJECTED)
        self.assertEqual(order.items.get().manga_copy.status, MangaCopy.Status.AVAILABLE)

    def test_checkout_before_approval_rejected(self):
        order_id = self.checkout().data['order_id']
        self.login(self.admin)
        self.assertEqual(self.client.post(f'/api/admin/orders/{order_id}/checkout/').status_code, 400)

    def _checked_out_item(self):
        order_id = self.checkout().data['order_id']
        self.login(self.admin)
        self.client.post(f'/api/admin/orders/{order_id}/approve/')
        self.client.post(f'/api/admin/orders/{order_id}/checkout/')
        return order_id, RentalOrderItem.objects.get(order_id=order_id)

    def test_fine_damage(self):
        order_id, item = self._checked_out_item()
        res = self.client.post(f'/api/admin/orders/{order_id}/items/{item.id}/fine/',
                               {'fine_type': 'DAMAGE', 'fine_amount': '50'}, format='json')
        self.assertEqual(res.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.item_status, RentalOrderItem.ItemStatus.RETURNED)
        self.assertEqual(item.manga_copy.status, MangaCopy.Status.MAINTENANCE)
        self.assertEqual(FineLog.objects.get().amount, Decimal('50'))
        self.assertEqual(RentalOrder.objects.get(id=order_id).total_fine, Decimal('50'))

    def test_fine_lost_and_validation(self):
        order_id, item = self._checked_out_item()
        bad = self.client.post(f'/api/admin/orders/{order_id}/items/{item.id}/fine/',
                               {'fine_type': 'OTHER', 'fine_amount': '5'}, format='json')
        self.assertEqual(bad.status_code, 400)
        neg = self.client.post(f'/api/admin/orders/{order_id}/items/{item.id}/fine/',
                               {'fine_type': 'LOST', 'fine_amount': '-1'}, format='json')
        self.assertEqual(neg.status_code, 400)
        res = self.client.post(f'/api/admin/orders/{order_id}/items/{item.id}/fine/',
                               {'fine_type': 'LOST', 'fine_amount': '200'}, format='json')
        self.assertEqual(res.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.item_status, RentalOrderItem.ItemStatus.LOST)
        self.assertEqual(item.manga_copy.status, MangaCopy.Status.LOST)

    def test_history_shows_late_and_lost(self):
        order_id, item = self._checked_out_item()
        RentalOrderItem.objects.filter(id=item.id).update(due_at=timezone.now() - timedelta(days=1))
        self.client.post(f'/api/admin/orders/{order_id}/items/{item.id}/return/')
        res = self.client.get('/api/admin/history/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data[0]['display_status'], 'LATE')

    def test_update_lost_items_command(self):
        _, item = self._checked_out_item()
        RentalOrderItem.objects.filter(id=item.id).update(due_at=timezone.now() - timedelta(days=91))
        call_command('update_lost_items', verbosity=0)
        item.refresh_from_db()
        self.assertEqual(item.item_status, RentalOrderItem.ItemStatus.LOST)
        self.assertEqual(item.manga_copy.status, MangaCopy.Status.LOST)


class RatingTests(BaseAPITest):
    def test_rate_returned_manga_updates_average(self):
        self.rent_and_return()
        self.login()
        res = self.client.post(f'/api/mangas/{self.manga.id}/review/', {'rating': 4}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['created'])
        self.assertEqual(res.data['avg_rating'], 4.0)
        self.assertEqual(res.data['rating_count'], 1)

        other = User.objects.create_user(username='second', password='x')
        self.rent_and_return(user=other)
        self.client.force_authenticate(other)
        res = self.client.post(f'/api/mangas/{self.manga.id}/review/', {'rating': 5}, format='json')
        self.assertEqual(res.data['avg_rating'], 4.5)
        self.assertEqual(res.data['rating_count'], 2)

        detail = self.client.get(f'/api/mangas/{self.manga.id}/')
        self.assertEqual(detail.data['avg_rating'], 4.5)
        self.assertEqual(detail.data['rating_count'], 2)

    def test_rating_again_updates_not_duplicates(self):
        self.rent_and_return()
        self.login()
        self.client.post(f'/api/mangas/{self.manga.id}/review/', {'rating': 2}, format='json')
        res = self.client.post(f'/api/mangas/{self.manga.id}/review/', {'rating': 5}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['created'])
        self.assertEqual(MangaReview.objects.count(), 1)
        self.assertEqual(res.data['avg_rating'], 5.0)

    def test_cannot_rate_without_return(self):
        self.login()
        res = self.client.post(f'/api/mangas/{self.manga.id}/review/', {'rating': 5}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_cannot_rate_while_still_checked_out(self):
        item = self.rent_and_return()
        RentalOrderItem.objects.filter(id=item.id).update(item_status=RentalOrderItem.ItemStatus.CHECKED_OUT)
        self.login()
        res = self.client.post(f'/api/mangas/{self.manga.id}/review/', {'rating': 5}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_invalid_rating_values(self):
        self.rent_and_return()
        self.login()
        for value in (0, 6, 'abc', 4.5, True, None):
            res = self.client.post(f'/api/mangas/{self.manga.id}/review/', {'rating': value}, format='json')
            self.assertEqual(res.status_code, 400, value)
        self.assertEqual(MangaReview.objects.count(), 0)

    def test_rate_unknown_manga_404(self):
        self.login()
        self.assertEqual(self.client.post('/api/mangas/999999/review/', {'rating': 3}, format='json').status_code, 404)

    def test_deleting_review_refreshes_average(self):
        self.rent_and_return()
        review = MangaReview.objects.create(manga=self.manga, user=self.user, rating=3)
        self.manga.refresh_from_db()
        self.assertEqual(self.manga.rating_count, 1)
        review.delete()
        self.manga.refresh_from_db()
        self.assertEqual(self.manga.rating_count, 0)
        self.assertEqual(self.manga.avg_rating, Decimal('0'))

    def test_orders_include_user_rating(self):
        self.rent_and_return()
        MangaReview.objects.create(manga=self.manga, user=self.user, rating=4)
        self.login()
        res = self.client.get('/api/orders/')
        item = res.data[0]['items'][0]
        self.assertEqual(item['manga_id'], self.manga.id)
        self.assertEqual(item['user_rating'], 4)


class PreferenceAndBehaviorTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.pool = [self.manga] + [make_manga(f'Title{i}', copies=1) for i in range(4)]

    def test_preferences_require_exactly_four_unique(self):
        self.login()
        ids = [m.id for m in self.pool]
        self.assertEqual(self.client.post('/api/preferences/', {'manga_ids': ids[:3]}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/preferences/', {'manga_ids': ids[:5]}, format='json').status_code, 400)
        dup = [ids[0], ids[0], ids[1], ids[2]]
        self.assertEqual(self.client.post('/api/preferences/', {'manga_ids': dup}, format='json').status_code, 400)

    def test_preferences_saved_once(self):
        self.login()
        ids = [m.id for m in self.pool[:4]]
        res = self.client.post('/api/preferences/', {'manga_ids': ids}, format='json')
        self.assertEqual(res.status_code, 201)
        get = self.client.get('/api/preferences/')
        self.assertTrue(get.data['has_preferences'])
        self.assertTrue(get.data['onboarding_completed'])
        self.assertEqual([p['manga_id'] for p in get.data['preferences']], ids)
        again = self.client.post('/api/preferences/', {'manga_ids': ids}, format='json')
        self.assertEqual(again.status_code, 403)

    def test_preferences_created_elsewhere_count_as_onboarded(self):
        for order, manga in enumerate(self.pool[:4], start=1):
            UserPreference.objects.create(user=self.user, manga=manga, order=order)
        self.login()
        self.assertTrue(self.client.get('/api/preferences/').data['onboarding_completed'])
        res = self.client.post('/api/preferences/', {'manga_ids': [m.id for m in self.pool[1:5]]}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_log_behavior(self):
        self.login()
        res = self.client.post('/api/behaviors/log/', {'manga_id': self.manga.id, 'event_type': 'CLICK',
                                                       'source': 'SEARCH'}, format='json')
        self.assertEqual(res.status_code, 201)
        log = UserBehaviorLog.objects.get()
        self.assertEqual((log.event_type, log.source), ('CLICK', 'SEARCH'))
        bad_source = self.client.post('/api/behaviors/log/', {'manga_id': self.manga.id, 'event_type': 'ADD_CART',
                                                              'source': 'NOPE'}, format='json')
        self.assertEqual(bad_source.status_code, 201)
        self.assertEqual(UserBehaviorLog.objects.get(event_type='ADD_CART').source, 'DIRECT')

    def test_log_behavior_rejects_rent_and_unknown(self):
        self.login()
        rent = self.client.post('/api/behaviors/log/', {'manga_id': self.manga.id, 'event_type': 'RENT'}, format='json')
        self.assertEqual(rent.status_code, 400)
        unknown = self.client.post('/api/behaviors/log/', {'manga_id': self.manga.id, 'event_type': 'LIKE'}, format='json')
        self.assertEqual(unknown.status_code, 400)

    def test_behavior_stats_admin_only(self):
        self.login()
        self.assertEqual(self.client.get('/api/admin/behaviors/stats/').status_code, 403)
        self.login(self.admin)
        res = self.client.get('/api/admin/behaviors/stats/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('ready_for_v2', res.data)


class RecommendationTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        cfg = ModelConfig.get()
        cfg.active_version = 'v2'
        cfg.save()
        from .recommender import RecommenderService
        RecommenderService._instance = None
        for i in range(12):
            make_manga(f'Extra{i}', copies=1)

    def test_recommendations_shape(self):
        self.login()
        res = self.client.get('/api/recommendations/')
        self.assertEqual(res.status_code, 200)
        if 'explanation_type' in res.data:   # popular fallback shape
            self.assertEqual(res.data['explanation_type'], 'popular')
            self.assertLessEqual(len(res.data['recommendations']), 10)
        else:
            self.assertIn('popular_fill', res.data)
            self.assertIn('has_preferences', res.data)
            total = len(res.data['recommendations']) + len(res.data['popular_fill'])
            self.assertLessEqual(total, 10)
            for rec in res.data['recommendations'] + res.data['popular_fill']:
                self.assertIn('explanation', rec)

    def test_recommendations_with_ab_variant_does_not_crash(self):
        variant = ABTestVariant.objects.create(name='A', algorithm='MBCGCN', traffic_percentage=100)
        ABTestAssignment.objects.create(user=self.user, variant=variant)
        self.login()
        res = self.client.get('/api/recommendations/')
        self.assertEqual(res.status_code, 200)
        if 'popular_fill' in res.data:
            self.assertEqual(ABTestEvent.objects.filter(event_type='IMPRESSION').count(),
                             len(res.data['recommendations']))


class AdminTests(BaseAPITest):
    def test_customer_gets_403_on_admin_endpoints(self):
        self.login()
        for method, path in (('get', '/api/admin/orders/'), ('get', '/api/admin/users/'),
                             ('post', '/api/admin/mangas/'), ('get', '/api/admin/history/'),
                             ('get', '/api/admin/ml/status/'), ('get', '/api/admin/ab-test/variants/')):
            self.assertEqual(getattr(self.client, method)(path).status_code, 403, path)

    def test_member_crud_and_soft_delete(self):
        self.login(self.admin)
        res = self.client.post('/api/admin/users/', {'username': 'walkin', 'email': 'w@example.com',
                                                     'password': 'Pass1234!', 'first_name': 'Walk'}, format='json')
        self.assertEqual(res.status_code, 201)
        uid = res.data['id']
        self.assertEqual(self.client.get(f'/api/admin/users/{uid}/').data['username'], 'walkin')
        self.assertEqual(self.client.put(f'/api/admin/users/{uid}/', {'phone': '0899999999'}, format='json').status_code, 200)
        self.assertEqual(User.objects.get(id=uid).phone, '0899999999')
        self.assertEqual(self.client.delete(f'/api/admin/users/{uid}/').status_code, 200)
        self.assertFalse(User.objects.get(id=uid).is_active)
        self.assertEqual(self.client.get(f'/api/admin/users/{uid}/').status_code, 404)

    def test_search_customers(self):
        self.user.first_name = 'Tanaka'
        self.user.save()
        self.login(self.admin)
        self.assertEqual(self.client.get('/api/admin/customers/search/?q=T').data, [])
        res = self.client.get('/api/admin/customers/search/?q=tana')
        self.assertEqual([u['id'] for u in res.data], [self.user.id])

    def test_manga_create_update_soft_delete(self):
        self.login(self.admin)
        res = self.client.post('/api/admin/mangas/', {'title': 'Vagabond', 'rental_price_per_day': '18.80',
                                                      'genre': 'Action', 'serial_numbers': 'VAG-01, VAG-02'})
        self.assertEqual(res.status_code, 201)
        manga = Manga.objects.get(title='Vagabond')
        self.assertEqual(manga.copies.count(), 2)
        self.assertEqual(self.client.put(f'/api/admin/mangas/{manga.id}/', {'rental_price_per_day': '20.00'}).status_code, 200)
        manga.refresh_from_db()
        self.assertEqual(manga.rental_price_per_day, Decimal('20.00'))
        self.rent_and_return(manga=manga)
        self.assertEqual(self.client.delete(f'/api/admin/mangas/{manga.id}/').status_code, 200)
        manga.refresh_from_db()
        self.assertFalse(manga.is_active)
        self.assertEqual(manga.copies.count(), 1)  # copy with history kept
        self.assertEqual(manga.copies.get().status, MangaCopy.Status.MAINTENANCE)

    def test_manga_create_rejects_missing_price(self):
        self.login(self.admin)
        self.assertEqual(self.client.post('/api/admin/mangas/', {'title': 'NoPrice'}).status_code, 400)

    def test_manual_checkout(self):
        self.login(self.admin)
        copy = self.manga.copies.first()
        res = self.client.post('/api/admin/manual-checkout/', {'user_id': self.user.id, 'copy_id': copy.id,
                                                               'rent_days': 4}, format='json')
        self.assertEqual(res.status_code, 201)
        copy.refresh_from_db()
        self.assertEqual(copy.status, MangaCopy.Status.RENTED)
        order = RentalOrder.objects.get(user=self.user)
        self.assertEqual(order.status, RentalOrder.Status.CHECKED_OUT)
        again = self.client.post('/api/admin/manual-checkout/', {'user_id': self.user.id, 'copy_id': copy.id},
                                 format='json')
        self.assertEqual(again.status_code, 409)

    def test_ab_variant_crud_and_metrics(self):
        self.login(self.admin)
        res = self.client.post('/api/admin/ab-test/variants/', {'name': 'Control', 'algorithm': 'POPULAR',
                                                               'traffic_percentage': 50}, format='json')
        self.assertEqual(res.status_code, 201)
        vid = res.data['id']
        self.assertEqual(self.client.put('/api/admin/ab-test/variants/', {'id': vid, 'traffic_percentage': 60},
                                         format='json').status_code, 200)
        self.assertEqual(float(ABTestVariant.objects.get(id=vid).traffic_percentage), 60.0)
        metrics = self.client.get('/api/admin/ab-test/metrics/')
        self.assertEqual(metrics.data['metrics'][0]['impressions'], 0)
        self.assertEqual(self.client.delete(f'/api/admin/ab-test/variants/?id={vid}').status_code, 200)

    def test_ml_status_and_config(self):
        self.login(self.admin)
        status_res = self.client.get('/api/admin/ml/status/')
        self.assertEqual(status_res.status_code, 200)
        self.assertFalse(status_res.data['is_training'])
        cfg = self.client.get('/api/admin/ml/config/')
        self.assertIn('availability', cfg.data)
        self.assertEqual(self.client.post('/api/admin/ml/config/', {'active_version': 'v3'}, format='json').status_code, 400)

    def test_retrain_rejects_bad_version_and_concurrent_runs(self):
        self.login(self.admin)
        self.assertEqual(self.client.post('/api/admin/ml/retrain/?model=v9').status_code, 400)
        ModelTrainingLog.objects.create(model_name='MB-CGCN-v2', status='RUNNING')
        self.assertEqual(self.client.post('/api/admin/ml/retrain/?model=v2').status_code, 400)

    def test_activate_requires_completed_log(self):
        self.login(self.admin)
        log = ModelTrainingLog.objects.create(model_name='MB-CGCN-v2', status='FAILED')
        self.assertEqual(self.client.post(f'/api/admin/ml/training-logs/{log.id}/activate/').status_code, 404)

    def test_health(self):
        res = self.client.get('/api/health/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {'status': 'ok'})


class PreferenceModelTests(BaseAPITest):
    def test_unique_user_manga(self):
        from django.db import IntegrityError, transaction
        UserPreference.objects.create(user=self.user, manga=self.manga, order=1)
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserPreference.objects.create(user=self.user, manga=self.manga, order=2)
