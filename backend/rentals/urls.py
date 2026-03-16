from django.urls import path
from .views import MangaDetailAPIView, MangaListAPIView, UserRegistrationAPIView

urlpatterns = [
    path('mangas/', MangaListAPIView.as_view(), name='manga-list'),
    path('mangas/<int:pk>/', MangaDetailAPIView.as_view(), name='manga-detail'),
    path('register/', UserRegistrationAPIView.as_view(), name='register'),
]