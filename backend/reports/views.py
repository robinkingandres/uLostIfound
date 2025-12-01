from rest_framework import viewsets, permissions, filters, status, exceptions
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model 
from django.db.models import Q, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
import calendar

# Import models including the new Notification model
from .models import Report, Claim, Notification 
# Import serializers including the new NotificationSerializer
from .serializers import ReportSerializer, ClaimSerializer, NotificationSerializer

# Import the new shared permission
from core.permissions import IsAdmin 

# Load the custom user model once
User = get_user_model() 

# --- DASHBOARD STATS API ---
class DashboardStatsView(APIView):
    # RBAC: Only Admins/Superusers can access dashboard stats
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        # 1. Existing Counts
        total_reports = Report.objects.count()
        lost_items = Report.objects.filter(type='Lost').count()
        found_items = Report.objects.filter(type='Found').count()
        claimed_items = Report.objects.filter(status='Claimed').count()
        pending_reports = Report.objects.filter(status='Pending').count()
        total_users = User.objects.count()
        
        # 2. Monthly Report Stats (Bar Chart Data)
        current_year = timezone.now().year
        
        # Query: Group by month and count IDs
        monthly_data = (
            Report.objects.filter(date_reported__year=current_year)
            .annotate(month=TruncMonth('date_reported'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )

        # Create a dictionary for quick lookup {month_integer: count}
        stats_dict = {item['month'].month: item['count'] for item in monthly_data}

        # Generate list for all 12 months (Jan-Dec) to ensure the chart has complete x-axis
        reports_by_month = []
        for i in range(1, 13):
            reports_by_month.append({
                'month': calendar.month_abbr[i], # 'Jan', 'Feb', etc.
                'value': stats_dict.get(i, 0)    # Default to 0 if no reports
            })

        data = {
            'totalReports': total_reports,
            'totalLostItems': lost_items,
            'totalFoundItems': found_items,
            'totalClaimedItems': claimed_items,
            'pendingReports': pending_reports,
            'totalUsers': total_users,
            'reportsByMonth': reports_by_month, # <--- Added this
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
        user = self.request.user
        is_admin = (user.role == 'Admin' or user.is_superuser)

        # RBAC Check: Prevent non-admins from changing the status
        # We check if 'status' is in the data being updated
        if 'status' in serializer.validated_data:
            new_status_req = serializer.validated_data['status']
            instance = self.get_object()
            
            # If the status is changing and the user is NOT an admin
            if instance.status != new_status_req and not is_admin:
                raise exceptions.PermissionDenied("Only Admins can change the report status.")

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
        
        # Allow detailed view of any item (DRF handles 404 if not found)
        if self.detail:
            return queryset
            
        report_type = self.request.query_params.get('type')
        status_filter = self.request.query_params.get('status')
        user = self.request.user
        
        # Check if user is Admin or Superuser
        is_admin = user.is_authenticated and (
            user.role == 'Admin' or user.is_superuser
        )

        # RBAC Visibility Logic:
        # Admins see everything.
        # Regular users (including the reporter) ONLY see 'Verified' reports in the public feed.
        if not is_admin:
            queryset = queryset.filter(status='Verified')

        # Filter by type (Lost/Found)
        if report_type:
            queryset = queryset.filter(type=report_type)
            
        # Filter by status
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset
    
    # Endpoint for users to see their own reports (Profile History)
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_reports(self, request):
        # Explicitly filter for the current user's reports
        queryset = Report.objects.filter(reporter=request.user)
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

    def update(self, request, *args, **kwargs):
        """
        RBAC: Restrict updating claims (e.g. changing status to Approved) to Admins.
        Regular users create claims, they shouldn't edit them (or definitely not approve them).
        """
        user = request.user
        if user.role != 'Admin' and not user.is_superuser:
             return Response(
                 {"detail": "You do not have permission to update claims."}, 
                 status=status.HTTP_403_FORBIDDEN
             )
        return super().update(request, *args, **kwargs)

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