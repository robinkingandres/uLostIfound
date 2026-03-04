from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    LoginView,
    LogoutView,
    RequestPasswordResetView,
    ResetPasswordView,
    VerifyPasswordResetCodeView,
    SettingsView,
    CategoryViewSet,
    SettingsCategoriesView,
    SettingsAiThresholdView,
)


# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'categories', CategoryViewSet, basename='categories')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('settings/', SettingsView.as_view(), name='site-settings'),
    path('settings/categories/', SettingsCategoriesView.as_view(), name='site-settings-categories'),
    path('settings/ai-threshold/', SettingsAiThresholdView.as_view(), name='site-settings-ai-threshold'),
    # New Authentication Endpoints
    path('auth/login/', LoginView.as_view(), name='api_login'), # /api/auth/login/
    path('auth/logout/', LogoutView.as_view(), name='api_logout'), # /api/auth/logout/

    path('auth/password-reset/request/', RequestPasswordResetView.as_view(), name='password_reset_request'),
    path('auth/password-reset/verify-code/', VerifyPasswordResetCodeView.as_view(), name='password_reset_verify_code'),
    path('auth/password-reset/confirm/', ResetPasswordView.as_view(), name='password_reset_confirm'),
    
    # Existing User Management Endpoints
    path('', include(router.urls)),
]
