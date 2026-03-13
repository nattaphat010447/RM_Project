from django.contrib import admin
from .models import User, Manga, MangaCopy, Cart, CartItem, RentalOrder, RentalOrderItem

@admin.register(Manga)
class MangaAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'rental_price_per_day', 'avg_rating')
    search_fields = ('title', 'author', 'isbn')

@admin.register(MangaCopy)
class MangaCopyAdmin(admin.ModelAdmin):
    list_display = ('serial_no', 'manga', 'status')
    list_filter = ('status',)
    search_fields = ('serial_no', 'manga__title')

@admin.register(RentalOrder)
class RentalOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_rent_fee', 'requested_at')
    list_filter = ('status', 'requested_at')

admin.site.register(User)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(RentalOrderItem)