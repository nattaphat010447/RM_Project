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
    cover_image_url = models.ImageField(upload_to='covers/', max_length=255, blank=True, null=True)
    rental_price_per_day = models.DecimalField(max_digits=10, decimal_places=2)

    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

    is_active = models.BooleanField(default=True)

    mbrs_id = models.IntegerField(null=True, blank=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class MangaCopy(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        RESERVED = 'RESERVED', 'Reserved'
        RENTED = 'RENTED', 'Rented'
        LOST = 'LOST', 'Lost'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'

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

class FineLog(models.Model):
    order_item = models.ForeignKey(RentalOrderItem, on_delete=models.CASCADE, related_name='fine_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    fine_type = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Fine: {self.user.username} - {self.fine_type} ({self.amount} THB)"

class MangaReview(models.Model):
    manga = models.ForeignKey(Manga, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('manga', 'user')

    def __str__(self):
        return f"{self.user.username} - {self.manga.title} ({self.rating} Stars)"

class UserPreference(models.Model):
    """
    Stores user's preferred manga for cold-start recommendations.
    Users select 4 manga during onboarding or can recalibrate anytime.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='preferences')
    manga = models.ForeignKey(Manga, on_delete=models.CASCADE)
    order = models.PositiveSmallIntegerField(default=0)  # Order of selection (1-4)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'manga')
        ordering = ['order']

    def __str__(self):
        return f"{self.user.username} prefers {self.manga.title} (#{self.order})"

class ABTestVariant(models.Model):
    """
    A/B Testing variants for recommendation algorithms
    """
    class AlgorithmType(models.TextChoices):
        MBCGCN = 'MBCGCN', 'MB-CGCN (Two Behaviors)'
        LIGHTGCN = 'LIGHTGCN', 'LightGCN'
        MATRIX_FACTORIZATION = 'MF', 'Matrix Factorization'
        POPULAR = 'POPULAR', 'Popular Items'

    name = models.CharField(max_length=100, unique=True)
    algorithm = models.CharField(max_length=50, choices=AlgorithmType.choices)
    traffic_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.algorithm} ({self.traffic_percentage}%)"

class ABTestAssignment(models.Model):
    """
    Tracks which variant each user is assigned to
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ab_assignments')
    variant = models.ForeignKey(ABTestVariant, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'variant')

    def __str__(self):
        return f"{self.user.username} -> {self.variant.name}"

class ABTestEvent(models.Model):
    """
    Tracks user interactions with recommendations for A/B test metrics
    """
    class EventType(models.TextChoices):
        IMPRESSION = 'IMPRESSION', 'Recommendation Shown'
        CLICK = 'CLICK', 'Manga Clicked'
        ADD_TO_CART = 'ADD_TO_CART', 'Added to Cart'
        RENTAL = 'RENTAL', 'Rented'

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    variant = models.ForeignKey(ABTestVariant, on_delete=models.CASCADE)
    manga = models.ForeignKey(Manga, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=50, choices=EventType.choices)

    session_id = models.CharField(max_length=100, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.event_type} - {self.manga.title} ({self.variant.name})"

class ModelTrainingLog(models.Model):
    """
    Tracks model training history and status
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        RUNNING = 'RUNNING', 'Running'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    model_name = models.CharField(max_length=100)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.PENDING)

    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    num_users = models.IntegerField(default=0)
    num_items = models.IntegerField(default=0)
    num_cart_interactions = models.IntegerField(default=0)
    num_rent_interactions = models.IntegerField(default=0)

    epochs = models.IntegerField(default=0)
    final_recall_at_10 = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    final_ndcg_at_10 = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)

    error_message = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.model_name} - {self.status} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
