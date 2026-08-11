from django.urls import path
from .views import (
    MangaDetailAPIView, MangaListAPIView, UserRegistrationAPIView,
    add_to_cart, admin_all_history, checkout_order, get_user_profile, view_cart,
    remove_from_cart, checkout_cart, my_orders, cancel_order,
    popular_mangas, admin_orders, approve_order, reject_order,
    return_item, fine_item, admin_users, admin_user_detail,
    admin_add_manga, admin_manage_manga, search_customers, manual_checkout,
    submit_manga_review, my_profile, RecommendationView, user_preferences,
    log_behavior, behavior_log_stats
)

from .admin_ml_views import ab_test_variants, ab_test_metrics, trigger_model_retrain, model_training_status

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
    path('users/profile/', my_profile, name='my-profile'),

    path('admin/orders/', admin_orders, name='admin-orders'),
    path('admin/orders/<int:order_id>/approve/', approve_order, name='approve-order'),
    path('admin/orders/<int:order_id>/reject/', reject_order, name='reject-order'),
    path('admin/orders/<int:order_id>/checkout/', checkout_order, name='checkout-order'),
    path('admin/orders/<int:order_id>/items/<int:item_id>/return/', return_item, name='return-item'),
    path('admin/orders/<int:order_id>/items/<int:item_id>/fine/', fine_item, name='fine-item'),
    path('admin/users/', admin_users, name='admin-users'),
    path('admin/users/<int:user_id>/', admin_user_detail, name='admin-user-detail'),
    path('admin/mangas/', admin_add_manga, name='admin-add-manga'),
    path('admin/mangas/<int:manga_id>/', admin_manage_manga, name='admin-manage-manga'),
    path('admin/customers/search/', search_customers, name='search-customers'),
    path('admin/manual-checkout/', manual_checkout, name='manual-checkout'),
    path('admin/history/', admin_all_history, name='admin-all-history'),
    path('mangas/<int:manga_id>/review/', submit_manga_review, name='submit-review'),

    path('recommendations/', RecommendationView.as_view(), name='manga-recommendations'),
    path('preferences/', user_preferences, name='user-preferences'),

    # Behavior logging (Phase 3)
    path('behaviors/log/', log_behavior, name='log-behavior'),
    path('admin/behaviors/stats/', behavior_log_stats, name='behavior-stats'),

    # A/B Testing endpoints
    path('admin/ab-test/variants/', ab_test_variants, name='ab-test-variants'),
    path('admin/ab-test/metrics/', ab_test_metrics, name='ab-test-metrics'),

    # Model training endpoints
    path('admin/ml/retrain/', trigger_model_retrain, name='trigger-retrain'),
    path('admin/ml/status/', model_training_status, name='training-status'),
]
