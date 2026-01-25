from rest_framework import viewsets, permissions, filters, status, exceptions
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model 
from django.db.models import Q, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
import calendar
from itertools import chain # Add this import if not present, though we can do list concatenation easily
from operator import itemgetter

# Import models
from .models import Report, Claim, Notification 
# Import serializers
from .serializers import ReportSerializer, ClaimSerializer, NotificationSerializer

# Import the new shared permission
from core.permissions import IsAdmin, IsGuidance

# Load the custom user model once
User = get_user_model() 

# --- DASHBOARD STATS API ---
class DashboardStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        # 1. Basic Counts
        total_reports = Report.objects.count()
        
        # 'Found' items are those reported as found
        found_items_count = Report.objects.filter(type='Found').count()
        
        # 'Claimed' items are any report (usually Found) marked as Claimed
        claimed_items_count = Report.objects.filter(status='Claimed').count()
        
        # 'Unclaimed' are Found items that are NOT yet Claimed (Pending, Verified, etc.)
        unclaimed_items_count = Report.objects.filter(type='Found').exclude(status='Claimed').count()
        
        lost_items_count = Report.objects.filter(type='Lost').count()
        pending_reports = Report.objects.filter(status='Pending').count()
        total_users = User.objects.count()
        
        # 2. Monthly Report Stats (for the main bar chart)
        current_year = timezone.now().year
        monthly_data = (
            Report.objects.filter(date_reported__year=current_year)
            .annotate(month=TruncMonth('date_reported'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        
        stats_dict = {item['month'].month: item['count'] for item in monthly_data}
        reports_by_month = []
        for i in range(1, 13):
            reports_by_month.append({
                'month': calendar.month_abbr[i],
                'value': stats_dict.get(i, 0)
            })

        data = {
            'totalReports': total_reports,
            'totalLostItems': lost_items_count,
            'totalFoundItems': found_items_count,
            'totalClaimedItems': claimed_items_count,
            'totalUnclaimedItems': unclaimed_items_count, # <-- NEW FIELD
            'pendingReports': pending_reports,
            'totalUsers': total_users,
            'reportsByMonth': reports_by_month,
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
        instance = self.get_object()

        # Ownership check: Non-admins can only edit their own reports
        if not is_admin and instance.reporter != user:
            raise exceptions.PermissionDenied("You can only edit your own reports.")

        # Status restriction: Non-admins can only edit Pending reports
        # This prevents bypassing admin verification by editing after approval
        if not is_admin and instance.status != 'Pending':
            raise exceptions.PermissionDenied(
                "You can only edit reports that are still pending review. "
                "Once a report has been verified, rejected, or claimed, it cannot be edited."
            )

        # RBAC Check: Prevent non-admins from changing the status
        if 'status' in serializer.validated_data:
            new_status_req = serializer.validated_data['status']
            
            if instance.status != new_status_req and not is_admin:
                raise exceptions.PermissionDenied("Only Admins can change the report status.")

        old_status = instance.status
        
        updated_report = serializer.save()
        
        new_status = updated_report.status
        
        if old_status != new_status:
            message = ""
            if new_status == 'Verified':
                message = f"Good news! Your report for '{updated_report.item_name}' has been Verified by the admin."
            elif new_status == 'Rejected':
                message = f"Update: Your report for '{updated_report.item_name}' was Rejected. Please check details."
            elif new_status == 'Claimed':
                message = f"Success! Your found item '{updated_report.item_name}' has been successfully Claimed."

            if message:
                Notification.objects.create(
                    recipient=updated_report.reporter,
                    message=message,
                    report=updated_report
                )

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to add ownership verification.
        Only the report owner or an admin can delete a report.
        """
        user = request.user
        instance = self.get_object()
        is_admin = (user.role == 'Admin' or user.is_superuser)

        # Ownership check: Only owner or admin can delete
        if not is_admin and instance.reporter != user:
            raise exceptions.PermissionDenied("You can only delete your own reports.")

        # Perform the deletion
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        queryset = self.queryset
        if self.detail:
            return queryset
            
        report_type = self.request.query_params.get('type')
        status_filter = self.request.query_params.get('status')
        user = self.request.user
        
        is_admin = user.is_authenticated and (
            user.role == 'Admin' or user.is_superuser
        )

        if not is_admin:
            queryset = queryset.filter(status='Verified')

        if report_type:
            queryset = queryset.filter(type=report_type)
            
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_reports(self, request):
        queryset = Report.objects.filter(reporter=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

# --- CLAIM VIEWSET ---
# backend/reports/views.py

class ClaimViewSet(viewsets.ModelViewSet):
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated] 

    def perform_create(self, serializer):
        serializer.save(claimant=self.request.user)

    def get_queryset(self):
        user = self.request.user
        # Allow Admin AND Guidance to see all claims
        if user.role in ['Admin', 'Guidance'] or user.is_superuser:
            return Claim.objects.all()
        return Claim.objects.filter(claimant=user)

    def update(self, request, *args, **kwargs):
        user = request.user
        
        # 1. Basic RBAC Check
        if user.role not in ['Admin', 'Guidance'] and not user.is_superuser:
             return Response({"detail": "You do not have permission to update claims."}, status=status.HTTP_403_FORBIDDEN)
        
        # 2. Strict Workflow Check
        new_status = request.data.get('status')
        if new_status:
            # ADMIN RESTRICTION: Can only Approve or Reject. Cannot Release (Claimed).
            if user.role == 'Admin' and not user.is_superuser:
                if new_status == 'Claimed':
                    return Response(
                        {"detail": "Admins can only Approve/Reject. Guidance Officer must perform final release."}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # GUIDANCE RESTRICTION: Can only Release (Claimed) or Reject. Cannot Approve from Pending.
            if user.role == 'Guidance' and not user.is_superuser:
                current_status = self.get_object().status
                if current_status == 'Pending' and new_status == 'Approved':
                     return Response(
                        {"detail": "Guidance Officers cannot approve pending claims. Admin must verify first."}, 
                        status=status.HTTP_403_FORBIDDEN
                    )

        return super().update(request, *args, **kwargs)
    
    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        
        updated_claim = serializer.save()
        new_status = updated_claim.status

        if old_status != new_status:
            message = ""
            
            # Admin Verification
            if new_status == 'Approved':
                message = f"Your claim for '{updated_claim.report.item_name}' has been Verified by Admin. Please proceed to the Guidance Office for physical verification and release."
            
            # Rejection (By either)
            elif new_status == 'Rejected':
                message = f"Update: Your claim for '{updated_claim.report.item_name}' was Rejected."
            
            # Guidance Release
            elif new_status == 'Claimed':
                message = f"Success! The item '{updated_claim.report.item_name}' has been released to you by the Guidance Office."
                
                # Update parent report
                report = updated_claim.report
                report.status = 'Claimed'
                report.save()

            if message:
                Notification.objects.create(
                    recipient=updated_claim.claimant,
                    message=message,
                    report=updated_claim.report
                )
    # --- FIX END ---

# --- NOTIFICATION VIEWSET ---
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all marked as read'})
    
class ActivityFeedView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        # 1. Fetch recent Reports (limit 10)
        recent_reports = Report.objects.select_related('reporter').all().order_by('-date_reported')[:10]
        
        # 2. Fetch recent Claims (limit 10)
        recent_claims = Claim.objects.select_related('claimant', 'report').all().order_by('-date_created')[:10]

        activities = []

        # 3. Format Reports
        for r in recent_reports:
            # Use name if available, else username
            user_name = f"{r.reporter.first_name} {r.reporter.last_name}".strip() or r.reporter.username
            
            activities.append({
                'id': f'report-{r.id}', # Unique string ID
                'user': user_name,
                'role': r.reporter.role,
                'action': f'Reported a {r.type.lower()}',
                'item': r.item_name,
                'timestamp': r.date_reported
            })

        # 4. Format Claims
        for c in recent_claims:
            user_name = f"{c.claimant.first_name} {c.claimant.last_name}".strip() or c.claimant.username
            
            activities.append({
                'id': f'claim-{c.id}',
                'user': user_name,
                'role': c.claimant.role,
                'action': 'Submitted a claim for',
                'item': c.report.item_name,
                'timestamp': c.date_created
            })

        # 5. Sort combined list by timestamp descending
        activities.sort(key=lambda x: x['timestamp'], reverse=True)

        # 6. Return top 10 most recent
        return Response(activities[:10], status=status.HTTP_200_OK)