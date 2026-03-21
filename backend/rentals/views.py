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
from decimal import Decimal

from .models import Manga, MangaCopy, Cart, CartItem, RentalOrder, RentalOrderItem, FineLog
from .serializers import AdminUserSerializer, MangaSerializer, UserRegistrationSerializer, CartItemSerializer, RentalOrderSerializer

from .permissions import IsAdminRole

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
    orders = RentalOrder.objects.all().order_by('-requested_at')
    serializer = RentalOrderSerializer(orders, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdminRole])
def approve_order(request, order_id):
    order = get_object_or_404(RentalOrder, id=order_id)
    if order.status != RentalOrder.Status.REQUESTED:
        return Response({"error": "Order is not requested."}, status=400)
    
    order.status = RentalOrder.Status.APPROVED
    order.approved_at = timezone.now()
    order.save()
    
    for item in order.items.all():
        item.item_status = RentalOrderItem.ItemStatus.APPROVED
        item.save()
        
    return Response({"message": "อนุมัติคำขอสำเร็จ!"})

@api_view(['POST'])
@permission_classes([IsAdminRole])
def reject_order(request, order_id):
    order = get_object_or_404(RentalOrder, id=order_id)
    if order.status != RentalOrder.Status.REQUESTED:
        return Response({"error": "Order is not requested."}, status=400)
    
    with transaction.atomic():
        order.status = RentalOrder.Status.REJECTED
        order.save()
        
        for item in order.items.all():
            item.item_status = RentalOrderItem.ItemStatus.CANCELLED
            item.save()
            item.manga_copy.status = MangaCopy.Status.AVAILABLE
            item.manga_copy.save()
            
    return Response({"message": "ปฏิเสธคำขอสำเร็จ"})

@api_view(['POST'])
@permission_classes([IsAdminRole])
def checkout_order(request, order_id):
    order = get_object_or_404(RentalOrder, id=order_id)
    if order.status != RentalOrder.Status.APPROVED:
        return Response({"error": "Order must be approved first."}, status=400)
    
    with transaction.atomic():
        order.status = RentalOrder.Status.CHECKED_OUT
        order.checked_out_at = timezone.now()
        
        for item in order.items.all():
            item.item_status = RentalOrderItem.ItemStatus.CHECKED_OUT
            item.rental_date = timezone.now()
            item.due_at = timezone.now() + timedelta(days=item.rent_days)
            item.save()
            
            item.manga_copy.status = MangaCopy.Status.RENTED
            item.manga_copy.save()
            
        order.save()
            
    return Response({"message": "ทำรายการรับหนังสือสำเร็จ!"})

@api_view(['POST'])
@permission_classes([IsAdminRole])
def return_item(request, order_id, item_id):
    item = get_object_or_404(RentalOrderItem, id=item_id, order__id=order_id)
    if item.item_status != RentalOrderItem.ItemStatus.CHECKED_OUT:
        return Response({"error": "Item is not checked out."}, status=400)

    with transaction.atomic():
        item.item_status = RentalOrderItem.ItemStatus.RETURNED
        item.returned_at = timezone.now()
        item.save()

        item.manga_copy.status = MangaCopy.Status.AVAILABLE
        item.manga_copy.save()

        order = item.order
        active_items = order.items.filter(item_status=RentalOrderItem.ItemStatus.CHECKED_OUT)
        if not active_items.exists():
            order.status = RentalOrder.Status.RETURNED
            order.returned_at = timezone.now()
            order.save()

    return Response({"message": "รับคืนหนังสือเรียบร้อย นำกลับขึ้นชั้นวางแล้ว!"})

@api_view(['POST'])
@permission_classes([IsAdminRole])
def fine_item(request, order_id, item_id):
    item = get_object_or_404(RentalOrderItem, id=item_id, order__id=order_id)
    if item.item_status != RentalOrderItem.ItemStatus.CHECKED_OUT:
        return Response({"error": "Item is not checked out."}, status=400)

    fine_type = request.data.get('fine_type', 'LATE')
    fine_amount = request.data.get('fine_amount', 0)

    with transaction.atomic():
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

        if Decimal(fine_amount) > 0:
            FineLog.objects.create(
                order_item=item,
                user=item.order.user,
                fine_type=fine_type,
                amount=Decimal(fine_amount)
            )

        order = item.order
        order.total_fine += Decimal(fine_amount)
        
        active_items = order.items.filter(item_status=RentalOrderItem.ItemStatus.CHECKED_OUT)
        if not active_items.exists():
            order.status = RentalOrder.Status.RETURNED
            order.returned_at = timezone.now()
            
        order.save()

    return Response({"message": f"บันทึกค่าปรับ {fine_amount} บาท และรับคืนสำเร็จ!"})

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

            return Response({"message": "สร้างสมาชิกสำเร็จ", "id": user.id}, status=201)
            
        except Exception as e:
            return Response({"error": f"ไม่สามารถสร้างสมาชิกได้: {str(e)}"}, status=400)


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
        return Response({"message": "อัปเดตข้อมูลสำเร็จ"})

    elif request.method == 'DELETE':
        user.is_active = False
        user.save()
        return Response({"message": "ลบสมาชิกออกจากระบบสำเร็จ (Soft Delete)"})

@api_view(['POST'])
@permission_classes([IsAdminRole])
def admin_add_manga(request):
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
        manga.copies.all().delete()
        
        manga.is_active = False
        manga.save()
        
        return Response({"message": "ลบหนังสือและสำเนาทั้งหมดสำเร็จ"})

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
    rent_days = int(data.get('rent_days', 7))

    user = get_object_or_404(User, id=user_id)
    copy = get_object_or_404(MangaCopy, id=copy_id, status=MangaCopy.Status.AVAILABLE)

    total_fee = copy.manga.rental_price_per_day * rent_days

    try:
        with transaction.atomic():
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
                rent_price_per_day=...,
                rent_days=rent_days,
                item_status='CHECKED_OUT',
                rental_date=timezone.now(),
                due_at = timezone.now() + timedelta(days=int(rent_days)) 
            )

            copy.status = MangaCopy.Status.RENTED
            copy.save()

        return Response({"message": "ทำรายการเช่าหน้าร้านสำเร็จ!"}, status=201)
    except Exception as e:
        return Response({"error": f"DB Error: {str(e)}"}, status=400)