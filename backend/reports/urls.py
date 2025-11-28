from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'reports', ReportViewSet)

# The API URLs are now determined automatically by the router.
# e.g., /api/reports/ and /api/reports/{id}/
urlpatterns = [
    path('', include(router.urls)),
]