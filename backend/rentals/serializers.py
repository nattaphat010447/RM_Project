from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Manga, MangaCopy, Cart, CartItem, RentalOrder, RentalOrderItem

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone', 'address', 'dob']

    def create(self, validated_data):
        password = validated_data.pop('password')
        username = validated_data.pop('username')
        email = validated_data.pop('email', '')

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            **validated_data
        )
        
        Cart.objects.create(user=user)
        return user

class MangaCopySerializer(serializers.ModelSerializer):
    class Meta:
        model = MangaCopy
        fields = ['id', 'serial_no', 'status']

class MangaSerializer(serializers.ModelSerializer):
    cover_image_url = serializers.SerializerMethodField()
    copies = MangaCopySerializer(many=True, read_only=True) 

    class Meta:
        model = Manga
        fields = '__all__'

    def get_cover_image_url(self, obj):
        if not obj.cover_image_url:
            return None
        
        raw_path = obj.cover_image_url.name
        
        if raw_path.startswith('/'):
            return raw_path
        
        return f"/media/{raw_path}"

class CartItemSerializer(serializers.ModelSerializer):
    manga_title = serializers.ReadOnlyField(source='manga_copy.manga.title')
    manga_cover = serializers.SerializerMethodField()
    rental_price_per_day = serializers.ReadOnlyField(source='manga_copy.manga.rental_price_per_day')
    serial_no = serializers.ReadOnlyField(source='manga_copy.serial_no')

    class Meta:
        model = CartItem
        fields = ['id', 'manga_title', 'manga_cover', 'rental_price_per_day', 'serial_no', 'rent_days', 'added_at']

    def get_manga_cover(self, obj):
        if obj.manga_copy.manga.cover_image_url:
            return obj.manga_copy.manga.cover_image_url.name
        return None

class RentalOrderItemSerializer(serializers.ModelSerializer):
    manga_title = serializers.ReadOnlyField(source='manga_copy.manga.title')
    serial_no = serializers.ReadOnlyField(source='manga_copy.serial_no')

    class Meta:
        model = RentalOrderItem
        fields = ['id', 'manga_title', 'serial_no', 'rent_price_per_day', 'rent_days', 'item_status', 'due_at']

class RentalOrderSerializer(serializers.ModelSerializer):
    items = RentalOrderItemSerializer(many=True, read_only=True)
    requested_at_formatted = serializers.DateTimeField(source='requested_at', format="%d/%m/%Y %H:%M", read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = RentalOrder
        fields = ['id', 'status', 'total_rent_fee', 'total_fine', 'requested_at_formatted', 'items', 'customer_name']

    def get_customer_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name if full_name else obj.user.username

class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'full_name', 'is_active']

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username