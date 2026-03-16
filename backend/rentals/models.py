from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = 'CUSTOMER', 'Customer'
        ADMIN = 'ADMIN', 'Admin'
        
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.CUSTOMER)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    dob = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.username

class Manga(models.Model):
    title = models.CharField(max_length=300)
    author = models.CharField(max_length=200, blank=True, null=True)
    genre = models.CharField(max_length=100, blank=True, null=True)
    cover_image_url = models.URLField(max_length=255, blank=True, null=True)
    rental_price_per_day = models.DecimalField(max_digits=10, decimal_places=2)
    
    isbn = models.CharField(max_length=20, blank=True, null=True)
    publisher = models.CharField(max_length=200, blank=True, null=True)
    publish_year = models.IntegerField(blank=True, null=True)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class MangaCopy(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        RENTED = 'RENTED', 'Rented'
        LOST = 'LOST', 'Lost'
        DAMAGED = 'DAMAGED', 'Damaged'

    manga = models.ForeignKey(Manga, on_delete=models.CASCADE, related_name='copies')
    serial_no = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.AVAILABLE)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.serial_no} ({self.manga.title})"

class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    manga_copy = models.ForeignKey(MangaCopy, on_delete=models.CASCADE)
    rent_days = models.PositiveIntegerField(default=7)
    added_at = models.DateTimeField(auto_now_add=True)

class RentalOrder(models.Model):
    class Status(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Requested'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CHECKED_OUT = 'CHECKED_OUT', 'Checked Out'
        RETURNED = 'RETURNED', 'Returned'
        CANCELLED = 'CANCELLED', 'Cancelled'

    user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='orders')
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.REQUESTED)
    total_rent_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_fine = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    checked_out_at = models.DateTimeField(blank=True, null=True)
    due_at = models.DateTimeField(blank=True, null=True)
    returned_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username} [{self.status}]"

class RentalOrderItem(models.Model):
    class ItemStatus(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Requested'
        APPROVED = 'APPROVED', 'Approved'
        CHECKED_OUT = 'CHECKED_OUT', 'Checked Out'
        RETURNED = 'RETURNED', 'Returned'
        LOST = 'LOST', 'Lost'
        CANCELLED = 'CANCELLED', 'Cancelled'

    order = models.ForeignKey(RentalOrder, on_delete=models.CASCADE, related_name='items')
    manga_copy = models.ForeignKey(MangaCopy, on_delete=models.RESTRICT)
    rent_price_per_day = models.DecimalField(max_digits=10, decimal_places=2)
    rent_days = models.PositiveIntegerField()
    
    item_status = models.CharField(max_length=50, choices=ItemStatus.choices, default=ItemStatus.REQUESTED)
    active_flag = models.BooleanField(default=True)
    
    rental_date = models.DateTimeField(auto_now_add=True)
    due_at = models.DateTimeField(blank=True, null=True)
    returned_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Order {self.order.id} | Copy {self.manga_copy.serial_no}"