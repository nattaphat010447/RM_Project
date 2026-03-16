from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Manga, MangaCopy, Cart

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
    copies = MangaCopySerializer(many=True, read_only=True) 

    class Meta:
        model = Manga
        fields = '__all__'