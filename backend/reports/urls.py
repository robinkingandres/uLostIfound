from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReportViewSet,
    ClaimViewSet,
    NotificationViewSet,
    DashboardStatsView,
    ActivityFeedView,
    AIMatchViewSet,
    AnalyticsView,
    LostFoundDashboardView,
    AdminAnalyticsView,
    AdminAnalyticsExportDataView,
    AdminAIMatchPerformanceView,
    AdminHonestyRankingView,
    AdminHonestyAwardsView,
)


# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'reports', ReportViewSet)
router.register(r'claims', ClaimViewSet)
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'ai-matches', AIMatchViewSet, basename='ai-matches')

# The API URLs are now determined automatically by the router.
# e.g., /api/reports/ and /api/reports/{id}/
urlpatterns = [
    path('admin/analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('admin/analytics/export-data/', AdminAnalyticsExportDataView.as_view(), name='admin-analytics-export-data'),
    path('admin/analytics/ai-match-performance/', AdminAIMatchPerformanceView.as_view(), name='admin-ai-match-performance'),
    path('admin/analytics/honesty-ranking/', AdminHonestyRankingView.as_view(), name='admin-honesty-ranking'),
    path('admin/analytics/honesty-awards/', AdminHonestyAwardsView.as_view(), name='admin-honesty-awards'),
    path('admin/ai/scan/', AIMatchViewSet.as_view({'post': 'scan_all'}), name='admin-ai-scan'),
    path('admin/ai/matches/', AIMatchViewSet.as_view({'get': 'list'}), name='admin-ai-matches-list'),
    path('admin/ai/matches/<int:pk>/', AIMatchViewSet.as_view({'patch': 'partial_update'}), name='admin-ai-matches-update'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/activity/', ActivityFeedView.as_view(), name='dashboard-activity'),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
    path('lost-found-dashboard/', LostFoundDashboardView.as_view(), name='lost-found-dashboard'),
    path('', include(router.urls)),
]
