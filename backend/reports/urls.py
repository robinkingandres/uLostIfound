from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet, DashboardStatsView
from .views import ReportViewSet, ClaimViewSet # Import ClaimViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'reports', ReportViewSet)
router.register(r'claims', ClaimViewSet) # Register claims endpoint

# The API URLs are now determined automatically by the router.
# e.g., /api/reports/ and /api/reports/{id}/
urlpatterns = [

    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'), # /api/dashboard/stats/
    path('', include(router.urls)),
    
    
]