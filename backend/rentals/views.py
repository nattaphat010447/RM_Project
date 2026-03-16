from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q

from .models import Manga, MangaCopy, Cart, CartItem, RentalOrder, RentalOrderItem
from .serializers import MangaSerializer, UserRegistrationSerializer, CartItemSerializer, RentalOrderSerializer

User = get_user_model()

class MangaListAPIView(generics.ListAPIView):
    queryset = Manga.objects.all()
    serializer_class = MangaSerializer

class MangaDetailAPIView(generics.RetrieveAPIView):
    queryset = Manga.objects.all()
    serializer_class = MangaSerializer

class UserRegistrationAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request, manga_id):
    user = request.user
    
    cart, created = Cart.objects.get_or_create(user=user)
    manga = get_object_or_404(Manga, id=manga_id)
    
    available_copy = MangaCopy.objects.filter(manga=manga, status=MangaCopy.Status.AVAILABLE).first()
    
    if not available_copy:
        return Response({"error": "Sorry, no copies are currently available for rent."}, status=400)
    
    if CartItem.objects.filter(cart=cart, manga_copy=available_copy).exists():
        return Response({"error": "This item is already in your cart."}, status=400)

    rent_days = request.data.get('rent_days', 7)
    CartItem.objects.create(cart=cart, manga_copy=available_copy, rent_days=rent_days)
    
    return Response({"message": f"'{manga.title}' added to cart successfully!"}, status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_cart(request):
    cart, created = Cart.objects.get_or_create(user=request.user)
    items = cart.items.all().order_by('-added_at')
    serializer = CartItemSerializer(items, many=True)
    return Response(serializer.data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    cart = Cart.objects.get(user=request.user)
    item = get_object_or_404(CartItem, id=item_id, cart=cart)
    item.delete()
    return Response({"message": "Item removed successfully"}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkout_cart(request):
    user = request.user
    cart = get_object_or_404(Cart, user=user)
    items = cart.items.all()

    if not items.exists():
        return Response({"error": "Your cart is empty."}, status=400)

    total_fee = sum([item.manga_copy.manga.rental_price_per_day * item.rent_days for item in items])

    try:
        with transaction.atomic():
            order = RentalOrder.objects.create(
                user=user,
                total_rent_fee=total_fee,
                status=RentalOrder.Status.REQUESTED
            )

            for item in items:
                RentalOrderItem.objects.create(
                    order=order,
                    manga_copy=item.manga_copy,
                    rent_price_per_day=item.manga_copy.manga.rental_price_per_day,
                    rent_days=item.rent_days,
                    item_status=RentalOrderItem.ItemStatus.REQUESTED
                )
                item.manga_copy.status = MangaCopy.Status.RESERVED
                item.manga_copy.save()

            items.delete()

        return Response({"message": "Rental request confirmed! Please wait for admin approval.", "order_id": order.id}, status=201)
    except Exception as e:
        return Response({"error": "System error during checkout."}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    orders = RentalOrder.objects.filter(user=request.user).order_by('-requested_at')
    serializer = RentalOrderSerializer(orders, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    order = get_object_or_404(RentalOrder, id=order_id, user=request.user)
    
    if order.status != RentalOrder.Status.REQUESTED:
        return Response({"error": "You can only cancel requested orders."}, status=400)
    
    try:
        with transaction.atomic():
            order.status = RentalOrder.Status.CANCELLED
            order.save()
            
            for item in order.items.all():
                item.item_status = RentalOrderItem.ItemStatus.CANCELLED
                item.save()
                
                item.manga_copy.status = MangaCopy.Status.AVAILABLE
                item.manga_copy.save()
                
        return Response({"message": "Order cancelled successfully."}, status=200)
    except Exception as e:
        return Response({"error": "System error during cancellation."}, status=500)
    
@api_view(['GET'])
def popular_mangas(request):
    last_week = timezone.now() - timedelta(days=7)
    
    popular = Manga.objects.annotate(
        rent_count=Count(
            'copies__rentalorderitem', 
            filter=Q(copies__rentalorderitem__rental_date__gte=last_week)
        )
    ).filter(rent_count__gt=0).order_by('-rent_count')[:10]
    
    serializer = MangaSerializer(popular, many=True)
    return Response(serializer.data)