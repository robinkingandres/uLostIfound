from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, LoginView, LogoutView, RequestPasswordResetView, ResetPasswordView


# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'users', UserViewSet)

# The API URLs are now determined automatically by the router.
urlpatterns = [
    # New Authentication Endpoints
    path('auth/login/', LoginView.as_view(), name='api_login'), # /api/auth/login/
    path('auth/logout/', LogoutView.as_view(), name='api_logout'), # /api/auth/logout/

    path('auth/password-reset/request/', RequestPasswordResetView.as_view(), name='password_reset_request'),
    path('auth/password-reset/confirm/', ResetPasswordView.as_view(), name='password_reset_confirm'),
    
    # Existing User Management Endpoints
    path('', include(router.urls)),
]