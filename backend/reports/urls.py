from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet, ClaimViewSet, NotificationViewSet, DashboardStatsView, ActivityFeedView


# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'reports', ReportViewSet)
router.register(r'claims', ClaimViewSet) # Register claims endpoint
router.register(r'notifications', NotificationViewSet, basename='notifications') # Add this

# The API URLs are now determined automatically by the router.
# e.g., /api/reports/ and /api/reports/{id}/
urlpatterns = [

    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'), # /api/dashboard/stats/
    path('dashboard/activity/', ActivityFeedView.as_view(), name='dashboard-activity'), # <-- NEW
    path('', include(router.urls)),
    
    
]