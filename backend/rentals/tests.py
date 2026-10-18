from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from .models import Manga, MangaCopy, Cart, CartItem, RentalOrder, UserPreference

User = get_user_model()


class MangaModelTest(TestCase):
    def setUp(self):
        self.manga = Manga.objects.create(
            title="Test Manga",
            author="Test Author",
            genre="Action/Adventure",
            rental_fee=Decimal("50.00"),
            is_active=True
        )

    def test_manga_creation(self):
        self.assertEqual(self.manga.title, "Test Manga")
        self.assertEqual(self.manga.author, "Test Author")
        self.assertEqual(self.manga.rental_fee, Decimal("50.00"))
        self.assertTrue(self.manga.is_active)

    def test_manga_str(self):
        self.assertEqual(str(self.manga), "Test Manga")


class MangaCopyModelTest(TestCase):
    def setUp(self):
        self.manga = Manga.objects.create(
            title="Test Manga",
            author="Test Author",
            rental_fee=Decimal("50.00")
        )
        self.copy = MangaCopy.objects.create(
            manga=self.manga,
            copy_number=1,
            status=MangaCopy.Status.AVAILABLE
        )

    def test_copy_creation(self):
        self.assertEqual(self.copy.manga, self.manga)
        self.assertEqual(self.copy.copy_number, 1)
        self.assertEqual(self.copy.status, MangaCopy.Status.AVAILABLE)

    def test_copy_status_change(self):
        self.copy.status = MangaCopy.Status.RENTED
        self.copy.save()
        self.assertEqual(self.copy.status, MangaCopy.Status.RENTED)


class CartAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='CUSTOMER'
        )
        self.client.force_authenticate(user=self.user)

        self.manga = Manga.objects.create(
            title="Test Manga",
            author="Test Author",
            rental_fee=Decimal("50.00"),
            is_active=True
        )
        self.copy = MangaCopy.objects.create(
            manga=self.manga,
            copy_number=1,
            status=MangaCopy.Status.AVAILABLE
        )

    def test_add_to_cart(self):
        response = self.client.post(
            f'/api/cart/add/{self.manga.id}/',
            {'rent_days': 7, 'copy_id': self.copy.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_view_cart(self):
        Cart.objects.create(user=self.user)
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_add_to_cart_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            f'/api/cart/add/{self.manga.id}/',
            {'rent_days': 7},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RentalOrderTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='CUSTOMER'
        )

    def test_order_creation(self):
        order = RentalOrder.objects.create(
            user=self.user,
            status=RentalOrder.Status.PENDING
        )
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.status, RentalOrder.Status.PENDING)

    def test_order_str(self):
        order = RentalOrder.objects.create(
            user=self.user,
            status=RentalOrder.Status.PENDING
        )
        self.assertIn('testuser', str(order))


class UserPreferenceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='CUSTOMER'
        )
        self.manga = Manga.objects.create(
            title="Test Manga",
            author="Test Author",
            rental_fee=Decimal("50.00")
        )

    def test_preference_creation(self):
        pref = UserPreference.objects.create(
            user=self.user,
            manga=self.manga
        )
        self.assertEqual(pref.user, self.user)
        self.assertEqual(pref.manga, self.manga)

    def test_preference_unique_together(self):
        UserPreference.objects.create(user=self.user, manga=self.manga)
        with self.assertRaises(Exception):
            UserPreference.objects.create(user=self.user, manga=self.manga)


class MangaAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manga = Manga.objects.create(
            title="Test Manga",
            author="Test Author",
            genre="Action",
            rental_fee=Decimal("50.00"),
            is_active=True
        )

    def test_list_mangas(self):
        response = self.client.get('/api/mangas/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_manga_detail(self):
        response = self.client.get(f'/api/mangas/{self.manga.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Test Manga")


class AdminPermissionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            role='ADMIN'
        )
        self.regular_user = User.objects.create_user(
            username='user',
            email='user@example.com',
            password='userpass123',
            role='CUSTOMER'
        )

    def test_admin_access(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_denied(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/admin/orders/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
