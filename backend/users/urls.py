from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, LoginView, LogoutView # <-- Import new views

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'users', UserViewSet)

# The API URLs are now determined automatically by the router.
urlpatterns = [
    # New Authentication Endpoints
    path('auth/login/', LoginView.as_view(), name='api_login'), # /api/auth/login/
    path('auth/logout/', LogoutView.as_view(), name='api_logout'), # /api/auth/logout/
    
    # Existing User Management Endpoints
    path('', include(router.urls)),
]