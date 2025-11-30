from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model 
from django.db.models import Q

# Import models including the new Notification model
from .models import Report, Claim, Notification 
# Import serializers including the new NotificationSerializer
from .serializers import ReportSerializer, ClaimSerializer, NotificationSerializer

# Load the custom user model once
User = get_user_model() 

# --- PERMISSION CLASS ---
class IsAdmin(permissions.BasePermission):
    """
    Custom permission to only allow users with role 'Admin' OR Superusers to access.
    """
    def has_permission(self, request, view):
        # Check if user is logged in AND (is an Admin role OR is a Django superuser)
        return request.user.is_authenticated and (
            request.user.role == 'Admin' or request.user.is_superuser
        )

# --- DASHBOARD STATS API ---
class DashboardStatsView(APIView):
    permission_classes = [IsAdmin] # Only Admins/Superusers can access

    def get(self, request, format=None):
        # Report Counts
        total_reports = Report.objects.count()
        lost_items = Report.objects.filter(type='Lost').count()
        found_items = Report.objects.filter(type='Found').count()
        claimed_items = Report.objects.filter(status='Claimed').count()
        pending_reports = Report.objects.filter(status='Pending').count()
        
        # User Counts
        total_users = User.objects.count()
        
        data = {
            'totalReports': total_reports,
            'totalLostItems': lost_items,
            'totalFoundItems': found_items,
            'totalClaimedItems': claimed_items,
            'pendingReports': pending_reports,
            'totalUsers': total_users,
        }
        return Response(data, status=status.HTTP_200_OK)

# --- REPORT VIEWSET ---
class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['item_name', 'description', 'location', 'category', 'reporter__username', 'reporter__school_id']
    ordering_fields = ['date_reported', 'type', 'status']

    def perform_create(self, serializer):
        # Automatically set the reporter to the logged-in user
        serializer.save(reporter=self.request.user)

    def perform_update(self, serializer):
        # 1. Get the old object before saving to compare status
        instance = self.get_object()
        old_status = instance.status
        
        # 2. Save the new data
        updated_report = serializer.save()
        
        # 3. Check if status changed and create Notification
        new_status = updated_report.status
        
        if old_status != new_status:
            # Determine message based on status
            message = ""
            if new_status == 'Verified':
                message = f"Good news! Your report for '{updated_report.item_name}' has been Verified by the admin."
            elif new_status == 'Rejected':
                message = f"Update: Your report for '{updated_report.item_name}' was Rejected. Please check details."
            elif new_status == 'Claimed':
                message = f"Success! Your found item '{updated_report.item_name}' has been successfully Claimed."

            # Create the notification if a message was generated
            if message:
                Notification.objects.create(
                    recipient=updated_report.reporter,
                    message=message,
                    report=updated_report
                )

    def get_queryset(self):
        queryset = self.queryset
        
        # Allow detailed view of any item
        if self.detail:
            return queryset
            
        report_type = self.request.query_params.get('type')
        status_filter = self.request.query_params.get('status')
        
        # Check if user is Admin or Superuser
        is_admin = self.request.user.is_authenticated and (
            self.request.user.role == 'Admin' or self.request.user.is_superuser
        )

        # Filter by type (Lost/Found)
        if report_type:
            queryset = queryset.filter(type=report_type)
            
        # Filter by status
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        elif not is_admin:
            # Regular users only see 'Verified' reports in the public feed
            queryset = queryset.filter(status='Verified')
            
        return queryset
    
    # Endpoint for users to see their own reports
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_reports(self, request):
        queryset = self.get_queryset().filter(reporter=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

# --- CLAIM VIEWSET ---
class ClaimViewSet(viewsets.ModelViewSet):
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(claimant=self.request.user)

    def get_queryset(self):
        user = self.request.user
        # Admins and Superusers see all claims
        if user.role == 'Admin' or user.is_superuser:
            return Claim.objects.all()
        # Regular users only see their own claims
        return Claim.objects.filter(claimant=user)

# --- NOTIFICATION VIEWSET ---
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for users to retrieve and manage their notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users only see their own notifications, ordered by newest first
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications for the current user as read"""
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all marked as read'})