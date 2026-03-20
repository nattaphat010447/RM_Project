from django.urls import path
from .views import MangaDetailAPIView, MangaListAPIView, UserRegistrationAPIView, add_to_cart, checkout_order, get_user_profile, reject_order, view_cart, remove_from_cart, checkout_cart, my_orders, cancel_order, popular_mangas, admin_orders, approve_order, reject_order

urlpatterns = [
    path('mangas/', MangaListAPIView.as_view(), name='manga-list'),
    path('mangas/<int:pk>/', MangaDetailAPIView.as_view(), name='manga-detail'),
    path('register/', UserRegistrationAPIView.as_view(), name='register'),
    path('cart/', view_cart, name='view-cart'),
    path('cart/add/<int:manga_id>/', add_to_cart, name='add-to-cart'),
    path('cart/remove/<int:item_id>/', remove_from_cart, name='remove-from-cart'),
    path('cart/checkout/', checkout_cart, name='checkout-cart'),
    path('orders/', my_orders, name='my-orders'),
    path('orders/<int:order_id>/cancel/', cancel_order, name='cancel-order'),
    path('mangas/popular/', popular_mangas, name='popular-mangas'),

    path('me/', get_user_profile, name='user-profile'),

    path('admin/orders/', admin_orders, name='admin-orders'),
    path('admin/orders/<int:order_id>/approve/', approve_order, name='approve-order'),
    path('admin/orders/<int:order_id>/reject/', reject_order, name='reject-order'),
    path('admin/orders/<int:order_id>/checkout/', checkout_order, name='checkout-order'),
]