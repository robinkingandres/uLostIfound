from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportViewSet, ClaimViewSet, NotificationViewSet, DashboardStatsView, ActivityFeedView, AIMatchViewSet, AnalyticsView, LostFoundDashboardView


# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'reports', ReportViewSet)
router.register(r'claims', ClaimViewSet)
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'ai-matches', AIMatchViewSet, basename='ai-matches')

# The API URLs are now determined automatically by the router.
# e.g., /api/reports/ and /api/reports/{id}/
urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/activity/', ActivityFeedView.as_view(), name='dashboard-activity'),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
    path('lost-found-dashboard/', LostFoundDashboardView.as_view(), name='lost-found-dashboard'),
    path('', include(router.urls)),
]