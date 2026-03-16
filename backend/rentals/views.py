from rest_framework import generics, permissions
from django.contrib.auth import get_user_model
from .models import Manga
from .serializers import MangaSerializer, UserRegistrationSerializer

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