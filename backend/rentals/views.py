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
from decimal import Decimal, InvalidOperation
from django.utils.dateformat import format
from rest_framework.views import APIView
from .recommender import RecommenderService

from .models import Manga, MangaCopy, Cart, CartItem, RentalOrder, RentalOrderItem, FineLog, MangaReview, UserPreference, ABTestVariant, ABTestEvent, ModelTrainingLog, UserBehaviorLog
from .serializers import AdminUserSerializer, MangaSerializer, UserRegistrationSerializer, CartItemSerializer, RentalOrderSerializer, UserProfileSerializer

from .permissions import IsAdminRole
from .ab_testing import ABTestManager
import subprocess
import threading
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

class MangaListAPIView(generics.ListAPIView):
    queryset = Manga.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = MangaSerializer

class MangaDetailAPIView(generics.RetrieveAPIView):
    queryset = Manga.objects.filter(is_active=True)
    serializer_class = MangaSerializer

class UserRegistrationAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request, manga_id):
    user = request.user

    try:
        rent_days = int(request.data.get('rent_days', 7))
    except (TypeError, ValueError):
        return Response({"error": "rent_days must be a valid integer."}, status=400)
    if rent_days < 1:
        return Response({"error": "rent_days must be at least 1."}, status=400)

    cart, created = Cart.objects.get_or_create(user=user)
    manga = get_object_or_404(Manga, id=manga_id)

    with transaction.atomic():
        # Check by manga, not by a specific copy - the same manga must not
        # be added twice even though it's tracked in the cart by copy id
        # (adding to cart doesn't reserve a copy, so a second call could
        # otherwise pick a different available copy of the same manga).
        if CartItem.objects.filter(cart=cart, manga_copy__manga=manga).exists():
            return Response({"error": "This item is already in your cart."}, status=400)

        available_copy = MangaCopy.objects.select_for_update().filter(
            manga=manga, status=MangaCopy.Status.AVAILABLE
        ).order_by('id').first()

        if not available_copy:
            return Response({"error": "Sorry, no copies are currently available for rent."}, status=400)

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
    items = list(cart.items.all())

    if not items:
        return Response({"error": "Your cart is empty."}, status=400)

    try:
        with transaction.atomic():
            copy_ids = [item.manga_copy_id for item in items]
            locked_copies = {
                c.id: c for c in MangaCopy.objects.select_for_update().filter(id__in=copy_ids)
            }

            unavailable_titles = []
            for item in items:
                copy = locked_copies.get(item.manga_copy_id)
                if not copy or copy.status != MangaCopy.Status.AVAILABLE:
                    unavailable_titles.append(item.manga_copy.manga.title)

            if unavailable_titles:
                return Response({
                    "error": f"Sorry, these items are no longer available: {', '.join(unavailable_titles)}. Please remove them from your cart and try again."
                }, status=409)

            total_fee = sum(item.manga_copy.manga.rental_price_per_day * item.rent_days for item in items)

            order = RentalOrder.objects.create(
                user=user,
                total_rent_fee=total_fee,
                status=RentalOrder.Status.REQUESTED
            )

            for item in items:
                copy = locked_copies[item.manga_copy_id]
                RentalOrderItem.objects.create(
                    order=order,
                    manga_copy=copy,
                    rent_price_per_day=copy.manga.rental_price_per_day,
                    rent_days=item.rent_days,
                    item_status=RentalOrderItem.ItemStatus.REQUESTED
                )
                copy.status = MangaCopy.Status.RESERVED
                copy.save()

            cart.items.filter(id__in=[item.id for item in items]).delete()

            # Auto-log RENT behavior for 3-behavior model training
            for item in items:
                UserBehaviorLog.objects.create(
                    user=user,
                    manga=item.manga_copy.manga,
                    event_type=UserBehaviorLog.EventType.RENT,
                    source=UserBehaviorLog.Source.DIRECT,
                )

        return Response({"message": "Rental request confirmed! Please wait for admin approval.", "order_id": order.id}, status=201)
    except Exception as e:
        logger.exception("checkout_cart failed for user %s", user.id)
        return Response({"error": "System error during checkout."}, status=500)

def _build_ratings_context(orders):
    """
    Build a {(user_id, manga_id): rating} map for every order/manga pair in
    `orders` with a single query, so RentalOrderItemSerializer.get_user_rating
    doesn't fire one MangaReview query per item.
    """
    user_ids = set()
    manga_ids = set()
    for order in orders:
        user_ids.add(order.user_id)
        for item in order.items.all():
            manga_ids.add(item.manga_copy.manga_id)

    if not user_ids or not manga_ids:
        return {'ratings_by_user_manga': {}}

    reviews = MangaReview.objects.filter(user_id__in=user_ids, manga_id__in=manga_ids)
    ratings_map = {(r.user_id, r.manga_id): r.rating for r in reviews}
    return {'ratings_by_user_manga': ratings_map}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    orders = list(
        RentalOrder.objects.filter(user=request.user)
        .select_related('user')
        .prefetch_related('items__manga_copy__manga')
        .order_by('-requested_at')
    )
    serializer = RentalOrderSerializer(orders, many=True, context=_build_ratings_context(orders))
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    try:
        with transaction.atomic():
            order = get_object_or_404(
                RentalOrder.objects.select_for_update(), id=order_id, user=request.user
            )

            if order.status != RentalOrder.Status.REQUESTED:
                return Response({"error": "You can only cancel requested orders."}, status=400)

            order.status = RentalOrder.Status.CANCELLED
            order.save()

            for item in order.items.all():
                item.item_status = RentalOrderItem.ItemStatus.CANCELLED
                item.save()

                item.manga_copy.status = MangaCopy.Status.AVAILABLE
                item.manga_copy.save()

        return Response({"message": "Order cancelled successfully."}, status=200)
    except Exception as e:
        logger.exception("cancel_order failed for order %s", order_id)
        return Response({"error": "System error during cancellation."}, status=500)
    
@api_view(['GET'])
def popular_mangas(request):
    last_week = timezone.now() - timedelta(days=7)

    # Only count rentals that were actually fulfilled, not requests that
    # were later cancelled/rejected (rental_date is set at creation time,
    # before approval, so it doesn't by itself mean the rental happened).
    popular = Manga.objects.annotate(
        rent_count=Count(
            'copies__rentalorderitem',
            filter=Q(
                copies__rentalorderitem__rental_date__gte=last_week,
                copies__rentalorderitem__item_status__in=[
                    RentalOrderItem.ItemStatus.CHECKED_OUT,
                    RentalOrderItem.ItemStatus.RETURNED,
                    RentalOrderItem.ItemStatus.LOST,
                ]
            )
        )
    ).filter(rent_count__gt=0).order_by('-rent_count')[:10]

    serializer = MangaSerializer(popular, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_manga_review(request, manga_id):
    rating = request.data.get('rating')

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response({"error": "Rating must be between 1 and 5"}, status=400)

    if not (1 <= rating <= 5):
        return Response({"error": "Rating must be between 1 and 5"}, status=400)

    has_returned = RentalOrderItem.objects.filter(
        order__user=request.user,
        manga_copy__manga_id=manga_id,
        item_status='RETURNED'
    ).exists()

    if not has_returned:
        return Response({"error": "You can only rate manga you have returned"}, status=403)

    review, created = MangaReview.objects.update_or_create(
        user=request.user,
        manga=Manga.objects.get(id=manga_id),
        defaults={'rating': int(rating)}
    )

    return Response({
        "message": "Rating submitted successfully.", 
        "rating": review.rating
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    user = request.user
    return Response({
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'first_name': user.first_name,
        'last_name': user.last_name
    })

@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_orders(request):
    orders = list(
        RentalOrder.objects.all()
        .select_related('user')
        .prefetch_related('items__manga_copy__manga')
        .order_by('-requested_at')
    )
    serializer = RentalOrderSerializer(orders, many=True, context=_build_ratings_context(orders))
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdminRole])
def approve_order(request, order_id):
    with transaction.atomic():
        order = get_object_or_404(RentalOrder.objects.select_for_update(), id=order_id)
        if order.status != RentalOrder.Status.REQUESTED:
            return Response({"error": "Order is not requested."}, status=400)

        order.status = RentalOrder.Status.APPROVED
        order.approved_at = timezone.now()
        order.save()

        for item in order.items.all():
            item.item_status = RentalOrderItem.ItemStatus.APPROVED
            item.save()

    return Response({"message": "Order approved successfully."})

@api_view(['POST'])
@permission_classes([IsAdminRole])
def reject_order(request, order_id):
    with transaction.atomic():
        order = get_object_or_404(RentalOrder.objects.select_for_update(), id=order_id)
        if order.status != RentalOrder.Status.REQUESTED:
            return Response({"error": "Order is not requested."}, status=400)

        order.status = RentalOrder.Status.REJECTED
        order.save()

        for item in order.items.all():
            item.item_status = RentalOrderItem.ItemStatus.CANCELLED
            item.save()
            item.manga_copy.status = MangaCopy.Status.AVAILABLE
            item.manga_copy.save()

    return Response({"message": "Order rejected."})

@api_view(['POST'])
@permission_classes([IsAdminRole])
def checkout_order(request, order_id):
    with transaction.atomic():
        order = get_object_or_404(RentalOrder.objects.select_for_update(), id=order_id)
        if order.status != RentalOrder.Status.APPROVED:
            return Response({"error": "Order must be approved first."}, status=400)

        items = list(order.items.select_related('manga_copy').all())
        copy_ids = [item.manga_copy_id for item in items]
        locked_copies = {
            c.id: c for c in MangaCopy.objects.select_for_update().filter(id__in=copy_ids)
        }

        not_reserved = [c for c in locked_copies.values() if c.status != MangaCopy.Status.RESERVED]
        if not_reserved:
            return Response({
                "error": "Some copies in this order are no longer reserved and cannot be checked out."
            }, status=409)

        order.status = RentalOrder.Status.CHECKED_OUT
        order.checked_out_at = timezone.now()

        for item in items:
            item.item_status = RentalOrderItem.ItemStatus.CHECKED_OUT
            item.rental_date = timezone.now()
            item.due_at = timezone.now() + timedelta(days=item.rent_days)
            item.save()

            copy = locked_copies[item.manga_copy_id]
            copy.status = MangaCopy.Status.RENTED
            copy.save()

        order.save()

    return Response({"message": "Checked out successfully."})

@api_view(['POST'])
@permission_classes([IsAdminRole])
def return_item(request, order_id, item_id):
    with transaction.atomic():
        item = get_object_or_404(
            RentalOrderItem.objects.select_for_update().select_related('manga_copy', 'order'),
            id=item_id, order__id=order_id
        )
        if item.item_status != RentalOrderItem.ItemStatus.CHECKED_OUT:
            return Response({"error": "Item is not checked out."}, status=400)

        item.item_status = RentalOrderItem.ItemStatus.RETURNED
        item.returned_at = timezone.now()
        item.save()

        item.manga_copy.status = MangaCopy.Status.AVAILABLE
        item.manga_copy.save()

        order = RentalOrder.objects.select_for_update().get(id=item.order_id)
        active_items = order.items.filter(item_status=RentalOrderItem.ItemStatus.CHECKED_OUT)
        if not active_items.exists():
            order.status = RentalOrder.Status.RETURNED
            order.returned_at = timezone.now()
            order.save()

    return Response({"message": "Item returned and shelved successfully."})

@api_view(['POST'])
@permission_classes([IsAdminRole])
def fine_item(request, order_id, item_id):
    fine_type = request.data.get('fine_type', 'LATE')
    if fine_type not in ('LATE', 'DAMAGE', 'LOST'):
        return Response({"error": "Invalid fine_type."}, status=400)

    try:
        fine_amount = Decimal(str(request.data.get('fine_amount', 0)))
    except (InvalidOperation, TypeError, ValueError):
        return Response({"error": "fine_amount must be a valid number."}, status=400)

    if fine_amount < 0:
        return Response({"error": "fine_amount cannot be negative."}, status=400)

    with transaction.atomic():
        item = get_object_or_404(
            RentalOrderItem.objects.select_for_update().select_related('manga_copy', 'order'),
            id=item_id, order__id=order_id
        )
        if item.item_status != RentalOrderItem.ItemStatus.CHECKED_OUT:
            return Response({"error": "Item is not checked out."}, status=400)

        if fine_type == 'LOST':
            item.item_status = RentalOrderItem.ItemStatus.LOST
            item.manga_copy.status = MangaCopy.Status.LOST
        elif fine_type == 'DAMAGE':
            item.item_status = RentalOrderItem.ItemStatus.RETURNED
            item.manga_copy.status = MangaCopy.Status.MAINTENANCE
        else:
            item.item_status = RentalOrderItem.ItemStatus.RETURNED
            item.manga_copy.status = MangaCopy.Status.AVAILABLE

        item.returned_at = timezone.now()
        item.save()
        item.manga_copy.save()

        if fine_amount > 0:
            FineLog.objects.create(
                order_item=item,
                user=item.order.user,
                fine_type=fine_type,
                amount=fine_amount
            )

        order = RentalOrder.objects.select_for_update().get(id=item.order_id)
        order.total_fine += fine_amount

        active_items = order.items.filter(item_status=RentalOrderItem.ItemStatus.CHECKED_OUT)
        if not active_items.exists():
            order.status = RentalOrder.Status.RETURNED
            order.returned_at = timezone.now()

        order.save()

    return Response({"message": f"Fine of {fine_amount} THB recorded and item returned."})

@api_view(['GET', 'POST'])
@permission_classes([IsAdminRole])
def admin_users(request):
    if request.method == 'GET':
        users = User.objects.filter(is_active=True).order_by('id')
        serializer = AdminUserSerializer(users, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        data = request.data
        try:
            username = data.get('username') or data.get('email', '').split('@')[0]
            
            user = User.objects.create(
                username=username,
                email=data.get('email'),
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                phone=data.get('phone', ''), 
                role='CUSTOMER',
                address=data.get('address', ''),
                dob=data.get('dob') or None 
            )
            user.set_password(data.get('password'))
            user.save()
            
            Cart.objects.get_or_create(user=user)

            return Response({"message": "Member created successfully.", "id": user.id}, status=201)
            
        except Exception as e:
            return Response({"error": f"Failed to create member: {str(e)}"}, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminRole])
def admin_user_detail(request, user_id):
    user = get_object_or_404(User, id=user_id, is_active=True)

    if request.method == 'GET':
        serializer = AdminUserSerializer(user)
        return Response(serializer.data)

    elif request.method == 'PUT':
        data = request.data
        
        user.username = data.get('username', user.username)
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.email = data.get('email', user.email)
        user.phone = data.get('phone', user.phone)
        user.address = data.get('address', user.address)
        
        dob = data.get('dob')
        if dob: user.dob = dob
        
        password = data.get('password')
        if password and password.strip() != "":
            user.set_password(password)

        user.save()
        return Response({"message": "Updated successfully."})

    elif request.method == 'DELETE':
        user.is_active = False
        user.save()
        return Response({"message": "Member deactivated successfully."})


@api_view(['POST'])
@permission_classes([IsAdminRole])
def admin_add_manga(request):
    from .mbrs_sync import sync_mbrs_id_for_manga

    serializer = MangaSerializer(data=request.data)
    if serializer.is_valid():
        manga = serializer.save(is_active=True)

        if 'cover_image_url' in request.FILES:
            manga.cover_image_url = request.FILES['cover_image_url']
            manga.save()

        serial_numbers = request.data.get('serial_numbers', '')
        if serial_numbers:
            for sn in serial_numbers.split(','):
                if sn.strip():
                    MangaCopy.objects.create(manga=manga, serial_no=sn.strip())

        # Auto-sync mbrs_id for MB-CGCN v1 matching
        sync_mbrs_id_for_manga(manga)

        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAdminRole])
def admin_manage_manga(request, manga_id):
    manga = get_object_or_404(Manga, id=manga_id)
    
    if request.method == 'PUT':
        serializer = MangaSerializer(manga, data=request.data, partial=True)
        if serializer.is_valid():
            manga = serializer.save()
            
            if 'cover_image_url' in request.FILES:
                manga.cover_image_url = request.FILES['cover_image_url']
                manga.save()
                
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
        
    elif request.method == 'DELETE':
        # MangaCopy is RESTRICT-protected by RentalOrderItem, so any copy that
        # has ever been part of an order can't be hard-deleted (that history
        # must be preserved). Only copies with no rental history are safe to
        # remove outright; copies with history are kept but taken out of
        # circulation instead.
        copies = manga.copies.all()
        kept_ids = list(
            copies.filter(rentalorderitem__isnull=False).values_list('id', flat=True).distinct()
        )

        copies.exclude(id__in=kept_ids).delete()
        MangaCopy.objects.filter(id__in=kept_ids).update(status=MangaCopy.Status.MAINTENANCE)

        manga.is_active = False
        manga.save()

        return Response({"message": "Manga removed successfully."})

@api_view(['GET'])
@permission_classes([IsAdminRole])
def search_customers(request):
    query = request.query_params.get('q', '')
    if len(query) < 2:
        return Response([])

    users = User.objects.filter(
        Q(first_name__icontains=query) | 
        Q(last_name__icontains=query) | 
        Q(email__icontains=query) | 
        Q(phone__icontains=query)
    ).filter(is_active=True, role='CUSTOMER')[:10]

    serializer = AdminUserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdminRole])
def manual_checkout(request):
    data = request.data
    user_id = data.get('user_id')
    copy_id = data.get('copy_id')

    try:
        rent_days = int(data.get('rent_days', 7))
    except (TypeError, ValueError):
        return Response({"error": "rent_days must be a valid integer."}, status=400)
    if rent_days < 1:
        return Response({"error": "rent_days must be at least 1."}, status=400)

    user = get_object_or_404(User, id=user_id)

    try:
        with transaction.atomic():
            copy = get_object_or_404(
                MangaCopy.objects.select_for_update(), id=copy_id
            )
            if copy.status != MangaCopy.Status.AVAILABLE:
                return Response({"error": "This copy is no longer available."}, status=409)

            total_fee = copy.manga.rental_price_per_day * rent_days

            order = RentalOrder.objects.create(
                user=user,
                total_rent_fee=total_fee,
                total_fine=0,
                status=RentalOrder.Status.CHECKED_OUT,
                approved_at=timezone.now(),
                checked_out_at=timezone.now()
            )

            RentalOrderItem.objects.create(
                order=order,
                manga_copy=copy,
                rent_price_per_day=copy.manga.rental_price_per_day,
                rent_days=rent_days,
                item_status='CHECKED_OUT',
                rental_date=timezone.now(),
                due_at=timezone.now() + timedelta(days=rent_days)
            )

            copy.status = MangaCopy.Status.RENTED
            copy.save()

        return Response({"message": "In-store rental recorded successfully."}, status=201)
    except Exception as e:
        logger.exception("manual_checkout failed")
        return Response({"error": "System error during manual checkout."}, status=400)

@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_all_history(request):
    history_items = RentalOrderItem.objects.filter(
        item_status__in=['CHECKED_OUT', 'RETURNED', 'LOST']
    ).select_related('order__user', 'manga_copy__manga').order_by('-rental_date')
    
    data = []
    for item in history_items:
        display_status = item.item_status
        if item.item_status == 'RETURNED':
            # Compare full timestamps, not just calendar dates - a book due at
            # 08:00 and returned at 23:00 the same day is still late.
            if item.returned_at and item.due_at and item.returned_at > item.due_at:
                display_status = 'LATE'
            else:
                display_status = 'ON_TIME'

        data.append({
            "order_id": item.order.id,
            "customer_name": item.order.user.get_full_name() or item.order.user.username,
            "manga_title": item.manga_copy.manga.title,
            "serial_no": item.manga_copy.serial_no,
            "rental_date_formatted": format(item.rental_date, 'd/m/y H:i') if item.rental_date else "-",
            "due_at_formatted": format(item.due_at, 'd/m/y H:i') if item.due_at else "-",
            "returned_at_formatted": format(item.returned_at, 'd/m/y H:i') if item.returned_at else "-",
            "item_status": item.item_status,
            "display_status": display_status
        })
        
    return Response(data)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    user = request.user
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)
        
    elif request.method == 'PUT':
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profile updated successfully."})
        return Response(serializer.errors, status=400)

class RecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = request.user.username
        service = RecommenderService()

        # Check if user has preferences (cold-start solution)
        user_prefs = UserPreference.objects.filter(user=request.user).select_related('manga')
        preference_mbrs_ids = [pref.manga.mbrs_id for pref in user_prefs if pref.manga.mbrs_id is not None]

        # Get recommendations with explanations
        rec_with_explanations = service.get_recommendations_with_explanations(
            username=username,
            preference_mbrs_ids=preference_mbrs_ids if preference_mbrs_ids else None,
            top_k=10
        )

        if not rec_with_explanations:
            # Fallback: try item-based from rental history
            past_rentals = RentalOrderItem.objects.filter(
                order__user=request.user
            ).values_list('manga_copy__manga__mbrs_id', flat=True).distinct()

            valid_past_ids = [m_id for m_id in past_rentals if m_id is not None]

            if valid_past_ids:
                recommended_ids = service.get_item_based_recommendations(valid_past_ids)
                rec_with_explanations = [(rid, 'rental_history', valid_past_ids[:3]) for rid in recommended_ids]

        if not rec_with_explanations:
            # Final fallback: popular manga
            queryset = Manga.objects.filter(is_active=True).order_by('-created_at')[:10]
            serializer = MangaSerializer(queryset, many=True, context={'request': request})
            return Response({
                'recommendations': serializer.data,
                'explanation_type': 'popular',
                'explanation': 'Popular and latest manga'
            })

        # Map mbrs_id to Manga objects
        mbrs_ids = [rec[0] for rec in rec_with_explanations]
        all_matches = Manga.objects.filter(mbrs_id__in=mbrs_ids, is_active=True)

        unique_mangas = {}
        for m in all_matches:
            if m.mbrs_id not in unique_mangas:
                unique_mangas[m.mbrs_id] = m

        sorted_mangas = []
        explanations = []

        for mbrs_id, explanation_type, source_ids in rec_with_explanations:
            if mbrs_id in unique_mangas:
                manga = unique_mangas[mbrs_id]
                sorted_mangas.append(manga)

                # Generate explanation text
                if explanation_type == 'user_history':
                    explanation = 'Recommended based on your rental history'
                elif explanation_type == 'preferences':
                    # Find manga titles from source_ids
                    source_mangas = Manga.objects.filter(mbrs_id__in=source_ids[:2], is_active=True)[:2]
                    if source_mangas:
                        titles = ', '.join([m.title for m in source_mangas])
                        explanation = f'Recommended because you liked {titles}'
                    else:
                        explanation = 'Recommended based on your preferences'
                elif explanation_type == 'rental_history':
                    source_mangas = Manga.objects.filter(mbrs_id__in=source_ids[:2], is_active=True)[:2]
                    if source_mangas:
                        titles = ', '.join([m.title for m in source_mangas])
                        explanation = f'Similar to manga you have rented: {titles}'
                    else:
                        explanation = 'Recommended based on your rental history'
                else:
                    explanation = 'Recommended for you'

                explanations.append(explanation)

        # Fill with popular if less than 10
        queryset = sorted_mangas[:10]
        if len(queryset) < 10:
            needed = 10 - len(queryset)
            existing_ids = [m.id for m in queryset]
            filler_mangas = list(Manga.objects.filter(is_active=True)
                                 .exclude(id__in=existing_ids)
                                 .order_by('-created_at')[:needed])
            queryset.extend(filler_mangas)
            explanations.extend(['Popular manga'] * needed)

        serializer = MangaSerializer(queryset, many=True, context={'request': request})

        # Add explanations to response
        recommendations_with_explanations = []
        for manga_data, explanation in zip(serializer.data, explanations):
            manga_data['explanation'] = explanation
            recommendations_with_explanations.append(manga_data)

        return Response({
            'recommendations': recommendations_with_explanations,
            'has_preferences': user_prefs.count() > 0
        })

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_preferences(request):
    """
    GET: Retrieve user's selected manga preferences (for cold-start)
    POST: Update user's manga preferences (select 4 manga)
    """
    user = request.user

    if request.method == 'GET':
        preferences = UserPreference.objects.filter(user=user).select_related('manga')
        data = []
        for pref in preferences:
            data.append({
                'id': pref.id,
                'manga_id': pref.manga.id,
                'manga_title': pref.manga.title,
                'manga_cover': request.build_absolute_uri(pref.manga.cover_image_url.url) if pref.manga.cover_image_url else None,
                'order': pref.order,
                'created_at': pref.created_at,
            })
        return Response({
            'preferences': data,
            'count': len(data),
            'has_preferences': len(data) > 0
        })

    elif request.method == 'POST':
        manga_ids = request.data.get('manga_ids', [])

        if not manga_ids or not isinstance(manga_ids, list):
            return Response({"error": "manga_ids must be a list."}, status=400)

        if len(manga_ids) < 4:
            return Response({"error": "Please select exactly 4 manga."}, status=400)

        if len(manga_ids) > 4:
            return Response({"error": "You can select at most 4 manga."}, status=400)

        # Check all manga exist
        mangas = Manga.objects.filter(id__in=manga_ids, is_active=True)
        if mangas.count() != len(manga_ids):
            return Response({"error": "One or more manga were not found."}, status=400)

        with transaction.atomic():
            # Clear existing preferences
            UserPreference.objects.filter(user=user).delete()

            # Create new preferences
            for order, manga_id in enumerate(manga_ids, start=1):
                manga = mangas.get(id=manga_id)
                UserPreference.objects.create(
                    user=user,
                    manga=manga,
                    order=order
                )

        return Response({
            "message": "Preferences saved successfully.",
            "manga_ids": manga_ids
        }, status=201)


# ============================================
# User Behavior Logging (Phase 3)
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_behavior(request):
    """
    Log user behavior for 3-behavior MB-CGCN model training.
    Frontend fires this non-blocking on CLICK and ADD_CART events.
    RENT is auto-logged by checkout_cart.
    """
    manga_id   = request.data.get('manga_id')
    event_type = request.data.get('event_type')
    source     = request.data.get('source', 'DIRECT')
    session_id   = request.data.get('session_id')
    duration_sec = request.data.get('duration_sec')
    position     = request.data.get('position')

    if not manga_id or not event_type:
        return Response({"error": "manga_id and event_type are required."}, status=400)

    valid_events = [e.value for e in UserBehaviorLog.EventType]
    if event_type not in valid_events:
        return Response({"error": f"event_type must be one of {valid_events}"}, status=400)

    # RENT is only logged by server-side checkout, not frontend
    if event_type == UserBehaviorLog.EventType.RENT:
        return Response({"error": "RENT events are logged automatically by the server."}, status=400)

    manga = get_object_or_404(Manga, id=manga_id, is_active=True)

    valid_sources = [s.value for s in UserBehaviorLog.Source]
    if source not in valid_sources:
        source = UserBehaviorLog.Source.DIRECT

    UserBehaviorLog.objects.create(
        user=request.user,
        manga=manga,
        event_type=event_type,
        source=source,
        session_id=session_id,
        duration_sec=duration_sec if isinstance(duration_sec, int) else None,
        position=position if isinstance(position, int) else None,
    )

    return Response({"ok": True}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def behavior_log_stats(request):
    """
    Summary stats for admin — how many behavior logs per type.
    Used in AdminMLTraining to show data readiness for v2 model.
    """
    from django.db.models import Count

    stats = (
        UserBehaviorLog.objects
        .values('event_type')
        .annotate(count=Count('id'))
        .order_by('event_type')
    )

    counts = {row['event_type']: row['count'] for row in stats}

    unique_users_with_click = (
        UserBehaviorLog.objects
        .filter(event_type='CLICK')
        .values('user')
        .distinct()
        .count()
    )

    return Response({
        'click_count':    counts.get('CLICK',    0),
        'add_cart_count': counts.get('ADD_CART', 0),
        'rent_count':     counts.get('RENT',     0),
        'unique_users_with_click': unique_users_with_click,
        'ready_for_v2': unique_users_with_click >= 50,
    })


@api_view(['GET'])
def health_check(request):
    """Simple health check endpoint for Railway healthchecks."""
    return Response({"status": "ok"})

