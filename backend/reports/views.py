from rest_framework import viewsets, permissions, filters, status, exceptions
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model 
from django.db.models import (
    Q,
    Count,
    Avg,
    F,
    Sum,
    Exists,
    OuterRef,
    Value,
    CharField,
)
from django.db.models.functions import (
    TruncMonth,
    TruncDay,
    TruncWeek,
    TruncYear,
    TruncHour,
    Coalesce,
    Concat,
    Trim,
    NullIf,
    Greatest,
)
from django.utils import timezone
from datetime import timedelta, datetime, date
from django.db import IntegrityError
import calendar
from itertools import chain # Add this import if not present, though we can do list concatenation easily
from operator import itemgetter

# Import models
from .models import Report, Claim, Notification, AIMatch
# Import serializers
from .serializers import ReportSerializer, ClaimSerializer, NotificationSerializer, AIMatchSerializer

# Import the new shared permission
from core.permissions import IsAdmin, IsGuidance
from users.models import SiteSettings

# Load the custom user model once
User = get_user_model() 

# --- DASHBOARD STATS API ---
class DashboardStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        # Get filter parameters
        time_period = request.query_params.get('time_period', 'monthly').lower()  # weekly, monthly, semester/last90, yearly
        if time_period in ['last90', 'last90days', '90days']:
            time_period = 'last90'

        if time_period not in ['weekly', 'monthly', 'semester', 'last90', 'yearly']:
            time_period = 'monthly'

        # Base queryset (no status filter; we want all series at once)
        base_queryset = Report.objects.all().annotate(
            has_active_match=Exists(
                AIMatch.objects.filter(
                    Q(lost_report_id=OuterRef('pk')) | Q(found_report_id=OuterRef('pk'))
                ).exclude(status='Rejected')
            )
        )
        
        # 1. Basic Counts (always use all reports, not filtered)
        total_reports = Report.objects.count()
        found_items_count = Report.objects.filter(type='Found').count()
        claimed_items_count = Report.objects.filter(status='Claimed').count()
        unclaimed_items_count = Report.objects.filter(type='Found').exclude(status='Claimed').count()
        lost_items_count = Report.objects.filter(type='Lost').count()
        pending_reports = Report.objects.filter(status='Pending').count()
        total_users = User.objects.count()
        
        # 2. Time-based Report Stats (line chart: lost, found, matched, claimed)
        today = timezone.localdate()

        def period_key(value):
            if hasattr(value, 'date'):
                return value.date()
            return value

        if time_period == 'weekly':
            # Current week (Sunday -> Saturday), daily buckets
            days_since_sunday = (today.weekday() + 1) % 7
            date_from = today - timedelta(days=days_since_sunday)
            date_to = date_from + timedelta(days=6)
            trunc_func = TruncDay
            period_list = [date_from + timedelta(days=i) for i in range(7)]
            label_for = lambda d: d.strftime('%A').lower()

        elif time_period == 'monthly':
            # Current month only (daily buckets)
            month_start = date(today.year, today.month, 1)
            days_in_month = calendar.monthrange(today.year, today.month)[1]
            month_end = date(today.year, today.month, days_in_month)
            date_from = month_start
            date_to = month_end
            trunc_func = TruncDay
            period_list = [month_start + timedelta(days=i) for i in range(days_in_month)]
            label_for = lambda d: str(d.day)

        elif time_period in ['semester', 'last90']:
            # Last 90 days (daily buckets). Keep "semester" as a backwards-compatible alias.
            date_to = today
            date_from = today - timedelta(days=89)
            trunc_func = TruncDay
            period_list = [date_from + timedelta(days=i) for i in range(90)]
            label_for = lambda d: d.strftime('%b %d').lower()

        else:  # yearly (fallback)
            date_from = date(today.year, 1, 1)
            date_to = today
            trunc_func = TruncMonth
            period_list = [date(today.year, i, 1) for i in range(1, 13)]
            label_for = lambda d: d.strftime('%b')

        time_data = (
            base_queryset.filter(date_reported__date__range=(date_from, date_to))
            .annotate(period=trunc_func('date_reported'))
            .values('period')
            .annotate(
                lost=Count('id', filter=Q(type='Lost')),
                found=Count('id', filter=Q(type='Found')),
                matched=Count('id', filter=Q(has_active_match=True)),
                claimed=Count('id', filter=Q(status='Claimed')),
            )
            .order_by('period')
        )

        stats_map = {period_key(item['period']): item for item in time_data}
        reports_by_period = []
        for period_start in period_list:
            entry = stats_map.get(period_start, {})
            reports_by_period.append({
                'period': label_for(period_start),
                'lost': entry.get('lost', 0),
                'found': entry.get('found', 0),
                'matched': entry.get('matched', 0),
                'claimed': entry.get('claimed', 0),
            })

        data = {
            'totalReports': total_reports,
            'totalLostItems': lost_items_count,
            'totalFoundItems': found_items_count,
            'totalClaimedItems': claimed_items_count,
            'totalUnclaimedItems': unclaimed_items_count,
            'pendingReports': pending_reports,
            'totalUsers': total_users,
            'reportsByMonth': reports_by_period,
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
        user = self.request.user
        initial_status = 'Verified' if (user.role == 'Guidance' or user.is_superuser) else 'Pending'
        report = serializer.save(reporter=user, status=initial_status)

        if report.type == 'Found':
            message = (
                f"Your report for '{report.item_name}' has been submitted. "
                "Please surrender the item to the Guidance Office at the Ground Floor, Main Building, "
                "beside the Principal's Office."
            )
        elif initial_status == 'Verified':
            message = f"Your report for '{report.item_name}' has been posted and is now visible on the feed."
        else:
            message = f"Your report for '{report.item_name}' has been submitted and is under review."
        Notification.objects.create(
            recipient=user,
            message=message,
            report=report
        )

    def check_report_owner_pending(self, instance):
        """Allow reporter to update/delete only their own Pending reports."""
        if instance.reporter != self.request.user:
            raise exceptions.PermissionDenied("You can only edit or delete your own reports.")
        if instance.status != 'Pending':
            raise exceptions.PermissionDenied("Only Pending reports can be edited or deleted.")

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        is_privileged = (user.role in ['Admin', 'Guidance'] or user.is_superuser)
        if instance.status in ['Verified', 'Rejected'] and not is_privileged:
            raise exceptions.PermissionDenied(
                "This report is finalized and can no longer be edited."
            )
        # Non-privileged users can only update their own Pending reports
        if not is_privileged:
            self.check_report_owner_pending(instance)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        is_admin = (user.role == 'Admin' or user.is_superuser)
        if not is_admin:
            self.check_report_owner_pending(instance)
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        user = self.request.user
        is_privileged = (user.role in ['Admin', 'Guidance'] or user.is_superuser)

        # RBAC Check: Prevent non-privileged users from changing the status
        if 'status' in serializer.validated_data:
            new_status_req = serializer.validated_data['status']
            instance = self.get_object()
            
            if instance.status != new_status_req and not is_privileged:
                raise exceptions.PermissionDenied("Only Admin/Guidance can change the report status.")

        instance = self.get_object()
        old_status = instance.status
        
        updated_report = serializer.save()
        
        new_status = updated_report.status
        
        if old_status != new_status:
            message = ""
            if new_status == 'Verified':
                message = f"Good news! Your report for '{updated_report.item_name}' has been Verified by the admin."
            elif new_status == 'Rejected':
                message = f"Update: Your report for '{updated_report.item_name}' was Rejected. Please follow the guidelines to avoid being rejected."
            elif new_status == 'Claimed':
                message = f"Success! Your found item '{updated_report.item_name}' has been successfully Claimed."

            if message:
                Notification.objects.create(
                    recipient=updated_report.reporter,
                    message=message,
                    report=updated_report
                )

    def get_queryset(self):
        # Always clone base queryset per request to avoid stale queryset caching.
        queryset = self.queryset.all().annotate(
            has_active_match=Exists(
                AIMatch.objects.filter(
                    Q(lost_report_id=OuterRef('pk')) | Q(found_report_id=OuterRef('pk'))
                ).exclude(status='Rejected')
            )
        )
        if getattr(self, 'action', None) in ['retrieve', 'update', 'partial_update', 'destroy']:
            return queryset

        report_type_raw = self.request.query_params.get('type')
        status_filter_raw = self.request.query_params.get('status')
        user = self.request.user

        is_admin_or_guidance = user.is_authenticated and (
            user.role in ['Admin', 'Guidance'] or user.is_superuser
        )

        if not is_admin_or_guidance:
            site_settings = SiteSettings.get_solo()
            visible_statuses = site_settings.home_visible_report_statuses or ['Verified']
            # Claimed items must stay visible on public board as final release records.
            if 'Claimed' not in visible_statuses:
                visible_statuses = [*visible_statuses, 'Claimed']
            queryset = queryset.filter(status__in=visible_statuses)

        report_type = (report_type_raw or '').strip().lower()
        status_filter = (status_filter_raw or '').strip().lower()

        # Treat "all" (any case) as no filter.
        if report_type and report_type != 'all':
            normalized_type = report_type.capitalize()
            queryset = queryset.filter(type=normalized_type)

        if status_filter and status_filter != 'all':
            normalized_status = status_filter.capitalize()
            queryset = queryset.filter(status=normalized_status)

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

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Claim, Notification
from .serializers import ClaimSerializer

class ClaimViewSet(viewsets.ModelViewSet):
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated] 

    def _handle_status_change(self, updated_claim, new_status):
        message = ""

        if new_status == 'Approved':
            message = f"Your claim for '{updated_claim.report.item_name}' has been Verified. Please proceed to the Guidance Office for physical verification and release."
        elif new_status == 'Rejected':
            reason = updated_claim.rejection_reason
            if reason:
                message = f"Update: Your claim for '{updated_claim.report.item_name}' was Rejected. Reason: {reason}"
            else:
                message = f"Update: Your claim for '{updated_claim.report.item_name}' was Rejected."
        elif new_status == 'Claimed':
            if not updated_claim.claimant_photo:
                raise exceptions.ValidationError(
                    {"detail": "Claimant photo is required before releasing an item."}
                )
            if not updated_claim.claimant_id_photo:
                raise exceptions.ValidationError(
                    {"detail": "Valid ID / Student ID photo is required before releasing an item."}
                )
            message = f"Success! The item '{updated_claim.report.item_name}' has been released to you by the Guidance Office."

            report = updated_claim.report
            report.status = 'Claimed'
            report.save()

            related_matches = AIMatch.objects.filter(
                Q(lost_report=report) | Q(found_report=report)
            ).exclude(status='Rejected')
            related_matches.update(
                match_score=100.0,
                status='Approved'
            )

            counterpart_report_ids = set()
            for match in related_matches.select_related('lost_report', 'found_report'):
                if match.lost_report_id == report.id:
                    counterpart_report_ids.add(match.found_report_id)
                elif match.found_report_id == report.id:
                    counterpart_report_ids.add(match.lost_report_id)

            if counterpart_report_ids:
                Report.objects.filter(id__in=counterpart_report_ids).exclude(status='Claimed').update(status='Claimed')

        if message and updated_claim.claimant:
            Notification.objects.create(
                recipient=updated_claim.claimant,
                message=message,
                report=updated_claim.report
            )

    def perform_create(self, serializer):
        user = self.request.user
        claimant = user
        claimant_id = self.request.data.get('claimantId')
        if claimant_id and (user.role in ['Admin', 'Guidance'] or user.is_superuser):
            try:
                claimant = User.objects.get(id=int(claimant_id))
            except (ValueError, TypeError, User.DoesNotExist):
                raise exceptions.ValidationError(
                    {"claimantId": "Selected claimant does not exist."}
                )
        claimant_full_name = (self.request.data.get('claimantNameInput') or '').strip()
        validated_full_name = (serializer.validated_data.get('claimant_full_name') or '').strip()
        is_manual_claim = bool(
            (user.role in ['Admin', 'Guidance'] or user.is_superuser)
            and (claimant_full_name or validated_full_name)
            and not claimant_id
        )
        if is_manual_claim:
            claimant = None
        try:
            created_claim = serializer.save(claimant=claimant)
        except IntegrityError:
            raise exceptions.ValidationError(
                {"detail": "You already submitted a claim for this item."}
            )

        is_privileged = (user.role in ['Admin', 'Guidance'] or user.is_superuser)
        if is_privileged and created_claim.status != 'Claimed':
            created_claim.refresh_from_db()
            if created_claim.claimant_photo and created_claim.claimant_id_photo:
                created_claim.status = 'Claimed'
                created_claim.save(update_fields=['status'])
                self._handle_status_change(created_claim, 'Claimed')

    def get_queryset(self):
        user = self.request.user
        report_id = self.request.query_params.get('report_id')
        base_qs = Claim.objects.select_related('claimant', 'report', 'report__reporter')
        # Allow Admin AND Guidance to see all claims
        if user.role in ['Admin', 'Guidance'] or user.is_superuser:
            queryset = base_qs
        else:
            queryset = base_qs.filter(claimant=user)

        if report_id:
            queryset = queryset.filter(report_id=report_id)
        return queryset

    def update(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()
        is_admin_or_guidance = user.role in ['Admin', 'Guidance'] or user.is_superuser
        is_claim_owner = instance.claimant_id == user.id

        # Claim owners can edit proof only while claim is still pending review.
        if is_claim_owner and not is_admin_or_guidance:
            if instance.status != 'Pending':
                return Response(
                    {"detail": "Only pending claims can be edited."},
                    status=status.HTTP_403_FORBIDDEN
                )
            if 'status' in request.data or 'rejection_reason' in request.data:
                return Response(
                    {"detail": "You can only edit proof details while claim is pending."},
                    status=status.HTTP_403_FORBIDDEN
                )
            return super().update(request, *args, **kwargs)

        # 1. Basic RBAC Check for workflow status updates
        if not is_admin_or_guidance:
            return Response({"detail": "You do not have permission to update claims."}, status=status.HTTP_403_FORBIDDEN)
        
        # 2. Workflow Check
        new_status = request.data.get('status')
        
        if new_status:
            # Any admin/guidance account can move claim status directly, including Claimed.
            pass

        return super().update(request, *args, **kwargs)
    
    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        
        # Save changes (including rejection_reason if sent in request)
        updated_claim = serializer.save()
        new_status = updated_claim.status

        if old_status != new_status:
            self._handle_status_change(updated_claim, new_status)
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
            if c.claimant:
                user_name = f"{c.claimant.first_name} {c.claimant.last_name}".strip() or c.claimant.username
                role = c.claimant.role
            else:
                user_name = c.claimant_full_name.strip() or "Walk-in claimant"
                role = "Guest"

            activities.append({
                'id': f'claim-{c.id}',
                'user': user_name,
                'role': role,
                'action': 'Submitted a claim for',
                'item': c.report.item_name,
                'timestamp': c.date_created
            })

        # 5. Sort combined list by timestamp descending
        activities.sort(key=lambda x: x['timestamp'], reverse=True)

        # 6. Return top 10 most recent
        return Response(activities[:10], status=status.HTTP_200_OK)


# --- AI MATCH VIEWSET ---
class AIMatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing AI-generated matches between Lost and Found reports.
    Admin can view all matches, approve/reject them.
    Users can view their own approved matches.
    """
    queryset = AIMatch.objects.all()
    serializer_class = AIMatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status')
        report_id = self.request.query_params.get('report_id')
        
        # Admins see all matches
        if user.role in ['Admin', 'Guidance'] or user.is_superuser:
            queryset = AIMatch.objects.all()
        else:
            # Regular users only see approved matches related to their reports
            queryset = AIMatch.objects.filter(
                Q(lost_report__reporter=user) | Q(found_report__reporter=user),
                status='Approved'
            )
        
        # Filter by report_id if provided (for View AI Matches button)
        if report_id:
            try:
                report_id_int = int(report_id)
                queryset = queryset.filter(
                    Q(lost_report_id=report_id_int) | Q(found_report_id=report_id_int)
                )
            except (ValueError, TypeError):
                pass  # Invalid report_id, ignore filter
        
        # Filter by status if provided
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-match_score', '-date_created')

    def update(self, request, *args, **kwargs):
        user = request.user
        
        # Only Admin/Guidance can update match status
        if user.role not in ['Admin', 'Guidance'] and not user.is_superuser:
            return Response(
                {"detail": "You do not have permission to update matches."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        
        updated_match = serializer.save()
        new_status = updated_match.status
        
        # Send notifications when match is approved
        if old_status != new_status and new_status == 'Approved':
            # Notify lost item reporter
            if not updated_match.lost_reporter_notified:
                Notification.objects.create(
                    recipient=updated_match.lost_report.reporter,
                    message=f"Great news! A potential match has been found for your lost item '{updated_match.lost_report.item_name}'. "
                            f"Match confidence: {updated_match.match_score}%. Please check your Matches page for details.",
                    report=updated_match.lost_report
                )
                updated_match.lost_reporter_notified = True
            
            # Notify found item reporter
            if not updated_match.found_reporter_notified:
                Notification.objects.create(
                    recipient=updated_match.found_report.reporter,
                    message=f"Great news! The item you found '{updated_match.found_report.item_name}' may belong to someone. "
                            f"Match confidence: {updated_match.match_score}%. An admin will coordinate the return process.",
                    report=updated_match.found_report
                )
                updated_match.found_reporter_notified = True
            
            updated_match.save()

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def scan_all(self, request):
        """
        Trigger a full scan to find all potential matches.
        Admin and Guidance.
        """
        user = request.user
        if user.role not in ['Admin', 'Guidance'] and not user.is_superuser:
            return Response(
                {"detail": "You do not have permission to scan for matches."},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            site_settings = SiteSettings.get_solo()
            if not site_settings.ai_matching_enabled:
                return Response({
                    'status': 'disabled',
                    'message': 'AI matching is disabled in system settings.',
                    'matches_created': 0
                }, status=status.HTTP_200_OK)
            from .ai_matching import find_potential_matches_all
            min_score_raw = request.data.get('min_score', None)
            try:
                min_score = float(min_score_raw) if min_score_raw not in [None, ''] else float(site_settings.ai_min_score)
            except (TypeError, ValueError):
                min_score = float(site_settings.ai_min_score)
            new_matches = find_potential_matches_all(min_score=min_score)
            total_matches = AIMatch.objects.exclude(status='Rejected').count()
            return Response({
                'status': 'success',
                'message': f'Scan complete. {len(new_matches)} new match(es) created. Active matches: {total_matches}.',
                'matches_created': len(new_matches),
                'active_matches': total_matches
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"AI scan_all failed: {e}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get match statistics for the dashboard."""
        user = request.user
        
        if user.role not in ['Admin', 'Guidance'] and not user.is_superuser:
            return Response(
                {"detail": "You do not have permission to view stats."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        total = AIMatch.objects.count()
        pending = AIMatch.objects.filter(status='Pending').count()
        approved = AIMatch.objects.filter(status='Approved').count()
        rejected = AIMatch.objects.filter(status='Rejected').count()
        
        return Response({
            'total': total,
            'pending': pending,
            'approved': approved,
            'rejected': rejected
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def my_matches(self, request):
        """Get matches for the current user's reports."""
        user = request.user
        
        # Get matches where user is either the lost or found reporter
        matches = AIMatch.objects.filter(
            Q(lost_report__reporter=user) | Q(found_report__reporter=user),
            status='Approved'
        ).order_by('-match_score', '-date_created')
        
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)


# --- ANALYTICS API ---
class AnalyticsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        # Get time frame from query parameter (default to 'monthly')
        time_frame = request.query_params.get('time_frame', 'monthly').lower()
        
        # Calculate date range based on time frame
        now = timezone.now()
        if time_frame == 'daily':
            start_date = now - timedelta(days=1)
            trunc_func = TruncHour
            date_format = '%H:00'
        elif time_frame == 'weekly':
            start_date = now - timedelta(weeks=4)
            trunc_func = TruncDay
            date_format = '%m/%d'
        elif time_frame == 'yearly':
            start_date = now - timedelta(days=365)
            trunc_func = TruncMonth
            date_format = '%b %Y'
        else:  # monthly (default)
            start_date = now - timedelta(days=30)
            trunc_func = TruncDay
            date_format = '%m/%d'
        
        current_year = now.year
        
        # 1. Average Resolution Time (days from report to claimed)
        # Use claims that have been approved/claimed to get actual resolution time
        claimed_claims = Claim.objects.filter(status='Claimed')
        resolution_times = []
        for claim in claimed_claims:
            if claim.report.date_reported and claim.date_created:
                # Time from report creation to claim approval
                days = (claim.date_created.date() - claim.report.date_reported.date()).days
                if days >= 0:
                    resolution_times.append(days)
        
        # Fallback: if no claimed claims, use reports marked as Claimed
        if not resolution_times:
            claimed_reports = Report.objects.filter(status='Claimed', date_reported__isnull=False)
            for report in claimed_reports:
                # Approximate: use date_reported to now
                days = (timezone.now().date() - report.date_reported.date()).days
                if days >= 0:
                    resolution_times.append(days)
        
        avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
        
        # 2. AI Match Accuracy (approved / total)
        total_matches = AIMatch.objects.count()
        approved_matches = AIMatch.objects.filter(status='Approved').count()
        ai_match_accuracy = (approved_matches / total_matches * 100) if total_matches > 0 else 0
        
        # 3. Success Rate (claimed items / found items)
        total_found = Report.objects.filter(type='Found').count()
        total_claimed = Report.objects.filter(status='Claimed').count()
        success_rate = (total_claimed / total_found * 100) if total_found > 0 else 0
        
        # 4. Lost vs Found Pattern (dual-series) with time frame support
        lost_items = (
            Report.objects.filter(type='Lost', date_reported__gte=start_date)
            .annotate(period=trunc_func('date_reported'))
            .values('period')
            .annotate(count=Count('id'))
            .order_by('period')
        )
        
        found_items = (
            Report.objects.filter(type='Found', date_reported__gte=start_date)
            .annotate(period=trunc_func('date_reported'))
            .values('period')
            .annotate(count=Count('id'))
            .order_by('period')
        )
        
        # Build dictionaries
        lost_dict = {}
        found_dict = {}
        
        for item in lost_items:
            period_key = item['period']
            if period_key is None:
                continue
            # Format datetime object
            try:
                if hasattr(period_key, 'strftime'):
                    period_key = period_key.strftime(date_format)
                else:
                    period_key = str(period_key)
            except (AttributeError, ValueError):
                period_key = str(period_key)
            lost_dict[period_key] = item['count']
        
        for item in found_items:
            period_key = item['period']
            if period_key is None:
                continue
            # Format datetime object
            try:
                if hasattr(period_key, 'strftime'):
                    period_key = period_key.strftime(date_format)
                else:
                    period_key = str(period_key)
            except (AttributeError, ValueError):
                period_key = str(period_key)
            found_dict[period_key] = item['count']
        
        # Get all unique periods and sort them
        all_periods = sorted(set(list(lost_dict.keys()) + list(found_dict.keys())))
        
        lost_found_pattern = []
        for period in all_periods:
            lost_found_pattern.append({
                'period': period,
                'lost': lost_dict.get(period, 0),
                'found': found_dict.get(period, 0)
            })
        
        # 5. Claim Processing Efficiency with time frame support
        claimed_items = (
            Claim.objects.filter(status='Claimed', date_created__gte=start_date)
            .annotate(period=trunc_func('date_created'))
            .values('period')
            .annotate(count=Count('id'))
            .order_by('period')
        )
        
        found_items_eff = (
            Report.objects.filter(type='Found', date_reported__gte=start_date)
            .annotate(period=trunc_func('date_reported'))
            .values('period')
            .annotate(count=Count('id'))
            .order_by('period')
        )
        
        verified_items = (
            Report.objects.filter(status='Verified', date_reported__gte=start_date)
            .annotate(period=trunc_func('date_reported'))
            .values('period')
            .annotate(count=Count('id'))
            .order_by('period')
        )
        
        # Build dictionaries
        claimed_dict = {}
        found_dict_eff = {}
        verified_dict = {}
        
        for item in claimed_items:
            period_key = item['period']
            if period_key is None:
                continue
            # Format datetime object
            try:
                if hasattr(period_key, 'strftime'):
                    period_key = period_key.strftime(date_format)
                else:
                    period_key = str(period_key)
            except (AttributeError, ValueError):
                period_key = str(period_key)
            claimed_dict[period_key] = item['count']
        
        for item in found_items_eff:
            period_key = item['period']
            if period_key is None:
                continue
            # Format datetime object
            try:
                if hasattr(period_key, 'strftime'):
                    period_key = period_key.strftime(date_format)
                else:
                    period_key = str(period_key)
            except (AttributeError, ValueError):
                period_key = str(period_key)
            found_dict_eff[period_key] = item['count']
        
        for item in verified_items:
            period_key = item['period']
            if period_key is None:
                continue
            # Format datetime object
            try:
                if hasattr(period_key, 'strftime'):
                    period_key = period_key.strftime(date_format)
                else:
                    period_key = str(period_key)
            except (AttributeError, ValueError):
                period_key = str(period_key)
            verified_dict[period_key] = item['count']
        
        # Get all unique periods and sort them
        all_periods_eff = sorted(set(list(claimed_dict.keys()) + list(found_dict_eff.keys()) + list(verified_dict.keys())))
        
        claim_efficiency = []
        for period in all_periods_eff:
            claim_efficiency.append({
                'period': period,
                'claimed': claimed_dict.get(period, 0),
                'found': found_dict_eff.get(period, 0),
                'verified': verified_dict.get(period, 0)
            })
        
        # 6. Status Distribution
        status_counts = Report.objects.values('status').annotate(count=Count('id'))
        status_distribution = {item['status']: item['count'] for item in status_counts}
        
        # 7. Category Distribution
        category_counts = Report.objects.values('category').annotate(count=Count('id')).order_by('-count')
        total_category_items = sum(item['count'] for item in category_counts)
        category_distribution = []
        for item in category_counts:
            percentage = (item['count'] / total_category_items * 100) if total_category_items > 0 else 0
            category_distribution.append({
                'category': item['category'],
                'count': item['count'],
                'percentage': round(percentage, 2)
            })
        
        data = {
            'averageResolutionTime': round(avg_resolution_time, 1),
            'aiMatchAccuracy': round(ai_match_accuracy, 1),
            'successRate': round(success_rate, 1),
            'lostFoundPattern': lost_found_pattern,
            'claimProcessingEfficiency': claim_efficiency,
            'statusDistribution': status_distribution,
            'categoryDistribution': category_distribution,
            'timeFrame': time_frame,
            'dateFormat': date_format,
        }
        
        return Response(data, status=status.HTTP_200_OK)


class AdminAnalyticsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        timeframe = request.query_params.get('timeframe', 'month').lower()
        if timeframe not in ['week', 'month', 'year']:
            timeframe = 'month'
        metrics_param = request.query_params.get('metrics', 'lost,found,claims,ai')
        active_metrics = [m.strip().lower() for m in metrics_param.split(',') if m.strip()]
        if not active_metrics:
            active_metrics = ['lost', 'found', 'claims', 'ai']

        date_from_param = request.query_params.get('date_from')
        date_to_param = request.query_params.get('date_to')
        category = request.query_params.get('category', 'all')

        now = timezone.now()
        today = timezone.localdate()

        try:
            if date_from_param:
                date_from = datetime.strptime(date_from_param, '%Y-%m-%d').date()
            else:
                default_days = 7 if timeframe == 'week' else (30 if timeframe == 'month' else 90)
                date_from = today - timedelta(days=default_days - 1)
        except ValueError:
            fallback_days = 7 if timeframe == 'week' else (30 if timeframe == 'month' else 90)
            date_from = today - timedelta(days=fallback_days - 1)

        try:
            date_to = datetime.strptime(date_to_param, '%Y-%m-%d').date() if date_to_param else today
        except ValueError:
            date_to = today

        if date_from > date_to:
            date_from, date_to = date_to, date_from

        reports_qs = Report.objects.filter(date_reported__date__range=(date_from, date_to))
        claims_qs = Claim.objects.filter(date_created__date__range=(date_from, date_to))
        matches_qs = AIMatch.objects.filter(date_created__date__range=(date_from, date_to))

        if category and category.lower() != 'all':
            reports_qs = reports_qs.filter(category=category)
            claims_qs = claims_qs.filter(report__category=category)
            matches_qs = matches_qs.filter(Q(lost_report__category=category) | Q(found_report__category=category))

        reports_today = reports_qs.filter(date_reported__date=today).count()
        total_reports = reports_qs.count()

        claims_today = claims_qs.filter(date_created__date=today).count()
        total_claims = claims_qs.count()

        resolved_claims = claims_qs.filter(status__in=['Approved', 'Rejected', 'Claimed']).count()
        resolution_rate = (resolved_claims / total_claims * 100) if total_claims else 0

        ai_matches_generated = matches_qs.count()
        ai_matches_today = matches_qs.filter(date_created__date=today).count()

        pending_claims = claims_qs.filter(status='Pending').count()
        overdue_cutoff = now - timedelta(days=7)
        overdue_claims = claims_qs.filter(status='Pending', date_created__lt=overdue_cutoff).count()

        resolved_for_time = claims_qs.filter(status__in=['Approved', 'Rejected', 'Claimed']).select_related('report')
        resolution_days = []
        for claim in resolved_for_time:
            report_date = claim.report.date_reported
            claim_date = claim.date_created
            if report_date and claim_date:
                delta_days = (claim_date.date() - report_date.date()).days
                if delta_days >= 0:
                    resolution_days.append(delta_days)
        avg_resolution_time_days = (sum(resolution_days) / len(resolution_days)) if resolution_days else 0

        # Always return daily buckets for analytics ranges to keep x-axis accurate.
        trunc_func = TruncDay
        period_step = 'day'
        period_label = lambda d: d.isoformat()

        period_reports = (
            reports_qs
            .annotate(period=trunc_func('date_reported'))
            .values('period')
            .annotate(
                lost=Count('id', filter=Q(type='Lost')),
                found=Count('id', filter=Q(type='Found')),
            )
            .order_by('period')
        )
        period_claims = (
            claims_qs
            .annotate(period=trunc_func('date_created'))
            .values('period')
            .annotate(
                claims=Count('id'),
                pending=Count('id', filter=Q(status='Pending')),
                due=Count('id', filter=Q(status='Pending', date_created__lt=overdue_cutoff)),
            )
            .order_by('period')
        )
        period_matches = (
            matches_qs
            .annotate(period=trunc_func('date_created'))
            .values('period')
            .annotate(ai=Count('id'))
            .order_by('period')
        )

        if period_step == 'day':
            period_list = []
            cursor = date_from
            while cursor <= date_to:
                period_list.append(cursor)
                cursor += timedelta(days=1)
        elif period_step == 'week':
            period_list = []
            cursor = date_from - timedelta(days=date_from.weekday())
            week_end = date_to - timedelta(days=date_to.weekday())
            while cursor <= week_end:
                period_list.append(cursor)
                cursor += timedelta(days=7)
        else:
            period_list = []
            cursor = date(date_from.year, date_from.month, 1)
            month_end = date(date_to.year, date_to.month, 1)
            while cursor <= month_end:
                period_list.append(cursor)
                if cursor.month == 12:
                    cursor = date(cursor.year + 1, 1, 1)
                else:
                    cursor = date(cursor.year, cursor.month + 1, 1)

        report_map = {entry['period'].date() if hasattr(entry['period'], 'date') else entry['period']: entry for entry in period_reports}
        claim_map = {entry['period'].date() if hasattr(entry['period'], 'date') else entry['period']: entry for entry in period_claims}
        match_map = {entry['period'].date() if hasattr(entry['period'], 'date') else entry['period']: entry for entry in period_matches}

        trends = []
        due_claims_monthly = []
        pending_claims_monthly = []
        for period_start in period_list:
            report_entry = report_map.get(period_start, {})
            claim_entry = claim_map.get(period_start, {})
            match_entry = match_map.get(period_start, {})

            period_text = period_label(period_start)
            trends.append({
                'month': period_text,
                'lost': report_entry.get('lost', 0),
                'found': report_entry.get('found', 0),
                'claims': claim_entry.get('claims', 0),
                'ai': match_entry.get('ai', 0),
            })
            due_claims_monthly.append({'month': period_text, 'count': claim_entry.get('due', 0)})
            pending_claims_monthly.append({'month': period_text, 'count': claim_entry.get('pending', 0)})

        for trend_row in trends:
            if 'lost' not in active_metrics:
                trend_row['lost'] = 0
            if 'found' not in active_metrics:
                trend_row['found'] = 0
            if 'claims' not in active_metrics:
                trend_row['claims'] = 0
            if 'ai' not in active_metrics:
                trend_row['ai'] = 0

        category_counts = (
            reports_qs
            .values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        categories = [
            {'name': item['category'] or 'Uncategorized', 'count': item['count']}
            for item in category_counts
        ]

        report_status_counts = (
            reports_qs
            .values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        status_breakdown = {
            (item['status'] or 'Unknown').lower(): item['count']
            for item in report_status_counts
        }

        location_counts = (
            reports_qs
            .values('location')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        locations = [
            {'name': item['location'] or 'Unspecified', 'count': item['count']}
            for item in location_counts
        ]

        data = {
            'filters': {
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
                'category': category,
                'timeframe': timeframe,
                'metrics': active_metrics,
            },
            'kpis': {
                'total_reports': total_reports,
                'reports_today': reports_today,
                'claims_submitted': total_claims,
                'claims_today': claims_today,
                'claims_resolved': resolved_claims,
                'resolution_rate': round(resolution_rate, 1),
                'ai_matches_generated': ai_matches_generated,
                'ai_matches_today': ai_matches_today,
                'avg_resolution_time_days': round(avg_resolution_time_days, 1),
                'pending_claims': pending_claims,
                'overdue_claims': overdue_claims,
            },
            'trends': trends,
            'due_claims_monthly': due_claims_monthly,
            'pending_claims_monthly': pending_claims_monthly,
            'categories': categories,
            'status_breakdown': status_breakdown,
            'locations': locations,
        }
        return Response(data, status=status.HTTP_200_OK)


def _parse_admin_date_range(request, *, default_days=30):
    today = timezone.localdate()
    date_from_param = (request.query_params.get('date_from') or '').strip()
    date_to_param = (request.query_params.get('date_to') or '').strip()

    try:
        date_from = datetime.strptime(date_from_param, '%Y-%m-%d').date() if date_from_param else (today - timedelta(days=default_days - 1))
    except ValueError:
        date_from = today - timedelta(days=default_days - 1)

    try:
        date_to = datetime.strptime(date_to_param, '%Y-%m-%d').date() if date_to_param else today
    except ValueError:
        date_to = today

    if date_from > date_to:
        date_from, date_to = date_to, date_from

    return date_from, date_to


class AdminAIMatchPerformanceView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        date_from, date_to = _parse_admin_date_range(request)
        category = (request.query_params.get('category') or 'all').strip()

        reports_qs = Report.objects.filter(date_reported__date__range=(date_from, date_to))
        matches_qs = AIMatch.objects.filter(date_created__date__range=(date_from, date_to))

        if category and category.lower() != 'all':
            reports_qs = reports_qs.filter(category=category)
            matches_qs = matches_qs.filter(Q(lost_report__category=category) | Q(found_report__category=category))

        successful_match_exists = Exists(
            AIMatch.objects.filter(
                Q(lost_report_id=OuterRef('pk')) | Q(found_report_id=OuterRef('pk')),
                status='Approved',
            )
        )
        reports_qs = reports_qs.annotate(has_successful_match=successful_match_exists)
        successful_reports = reports_qs.filter(has_successful_match=True).count()
        unmatched_reports = reports_qs.filter(has_successful_match=False).count()

        approved_matches = list(
            matches_qs.filter(status='Approved')
            .select_related('lost_report', 'found_report')
            .only('date_created', 'lost_report__date_reported', 'found_report__date_reported')
        )

        bucket_defs = [
            ('0d', lambda d: d == 0),
            ('1d', lambda d: d == 1),
            ('2d', lambda d: d == 2),
            ('3-4d', lambda d: 3 <= d <= 4),
            ('5-7d', lambda d: 5 <= d <= 7),
            ('8-14d', lambda d: 8 <= d <= 14),
            ('15-30d', lambda d: 15 <= d <= 30),
            ('31+d', lambda d: d >= 31),
        ]
        bucket_counts = {label: 0 for (label, _) in bucket_defs}

        deltas = []
        delta_hours = []
        for match in approved_matches:
            lost_dt = getattr(match.lost_report, 'date_reported', None)
            found_dt = getattr(match.found_report, 'date_reported', None)
            later_report = None
            if lost_dt and found_dt:
                later_report = max(lost_dt, found_dt)
            else:
                later_report = lost_dt or found_dt
            if not later_report or not match.date_created:
                continue
            delta_seconds = (match.date_created - later_report).total_seconds()
            if delta_seconds < 0:
                continue
            delta_hours.append(delta_seconds / 3600)
            delta_days = (match.date_created.date() - later_report.date()).days
            deltas.append(delta_days)
            for label, predicate in bucket_defs:
                if predicate(delta_days):
                    bucket_counts[label] += 1
                    break

        histogram = [{'bucket': label, 'count': bucket_counts[label]} for (label, _) in bucket_defs]
        avg_hours = (sum(delta_hours) / len(delta_hours)) if delta_hours else 0.0

        accepted_count = matches_qs.filter(status='Approved').count()
        pending_count = matches_qs.filter(status='Pending').count()
        rejected_count = matches_qs.filter(status='Rejected').count()
        total_suggestions = accepted_count + pending_count + rejected_count
        success_rate = round((accepted_count / total_suggestions * 100), 1) if total_suggestions else 0.0

        return Response({
            'filters': {
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
                'category': category,
            },
            'donut': {
                'successful_matches': successful_reports,
                'unmatched_reports': unmatched_reports,
            },
            'suggestions': {
                'accepted': accepted_count,
                'pending': pending_count,
                'rejected': rejected_count,
                'total': total_suggestions,
                'success_rate': success_rate,
            },
            'histogram': histogram,
            'avg_time_to_match_hours': round(avg_hours, 1),
        }, status=status.HTTP_200_OK)


class AdminHonestyRankingView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        date_from, date_to = _parse_admin_date_range(request)
        category = (request.query_params.get('category') or 'all').strip()

        base_qs = Report.objects.filter(
            type='Found',
            date_reported__date__range=(date_from, date_to),
        ).select_related('reporter')

        if category and category.lower() != 'all':
            base_qs = base_qs.filter(category=category)

        full_name = Trim(
            Concat(
                Coalesce(F('reporter__first_name'), Value('')),
                Value(' '),
                Coalesce(F('reporter__last_name'), Value('')),
            )
        )
        identifier_expr = Coalesce(
            NullIf(full_name, Value('')),
            NullIf(F('reporter__school_id'), Value('')),
            NullIf(F('reporter__email'), Value('')),
            NullIf(F('reporter__username'), Value('')),
            Value('Unknown'),
            output_field=CharField(),
        )

        leaders = list(
            base_qs
            .annotate(identifier=identifier_expr)
            .values('identifier')
            .annotate(surrender_count=Count('id'))
            .order_by('-surrender_count', 'identifier')[:25]
        )

        payload = []
        for idx, row in enumerate(leaders, start=1):
            payload.append({
                'rank': idx,
                'identifier': row['identifier'],
                'surrender_count': row['surrender_count'],
            })

        return Response({
            'filters': {
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
                'category': category,
            },
            'results': payload,
        }, status=status.HTTP_200_OK)


class AdminHonestyAwardsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        date_from, date_to = _parse_admin_date_range(request)
        category = (request.query_params.get('category') or 'all').strip()
        limit_param = (request.query_params.get('limit') or '').strip()

        try:
            limit = int(limit_param) if limit_param else 50
        except (TypeError, ValueError):
            limit = 50

        limit = max(1, min(limit, 200))

        base_qs = Report.objects.filter(
            type='Found',
            date_lost_or_found__range=(date_from, date_to),
        ).select_related('reporter')

        if category and category.lower() != 'all':
            base_qs = base_qs.filter(category=category)

        base_qs = base_qs.order_by('-date_lost_or_found', '-date_reported')

        results = []
        for report in base_qs[:limit]:
            reporter = report.reporter
            reported_name = (report.person_name or '').strip()
            full_name = f"{(reporter.first_name or '').strip()} {(reporter.last_name or '').strip()}".strip()
            reporter_label = reported_name or full_name or getattr(reporter, 'username', '') or 'Unknown'

            results.append({
                'report_id': report.id,
                'found_by': reporter_label,
                'grade': report.person_grade or '',
                'section': report.person_section or '',
                'date_found': report.date_lost_or_found.isoformat() if report.date_lost_or_found else '',
                'category': report.category or 'Uncategorized',
                'item_name': report.item_name or '',
                'returned': report.status == 'Claimed',
            })

        return Response({
            'filters': {
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
                'category': category,
            },
            'results': results,
        }, status=status.HTTP_200_OK)


class AdminAnalyticsExportDataView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        timeframe = request.query_params.get('timeframe', 'month').lower()
        if timeframe not in ['week', 'month', 'year']:
            timeframe = 'month'

        date_from_param = request.query_params.get('date_from')
        date_to_param = request.query_params.get('date_to')
        category = request.query_params.get('category', 'all')
        today = timezone.localdate()

        try:
            if date_from_param:
                date_from = datetime.strptime(date_from_param, '%Y-%m-%d').date()
            else:
                default_days = 7 if timeframe == 'week' else (30 if timeframe == 'month' else 90)
                date_from = today - timedelta(days=default_days - 1)
        except ValueError:
            fallback_days = 7 if timeframe == 'week' else (30 if timeframe == 'month' else 90)
            date_from = today - timedelta(days=fallback_days - 1)

        try:
            date_to = datetime.strptime(date_to_param, '%Y-%m-%d').date() if date_to_param else today
        except ValueError:
            date_to = today

        if date_from > date_to:
            date_from, date_to = date_to, date_from

        reports = (
            Report.objects
            .select_related('reporter')
            .prefetch_related('claims__claimant')
            .filter(date_reported__date__range=(date_from, date_to))
            .order_by('-date_reported')
        )

        if category and category.lower() != 'all':
            reports = reports.filter(category=category)

        rows = []
        for report in reports:
            reporter = report.reporter
            reporter_name = f"{reporter.first_name} {reporter.last_name}".strip() or reporter.username
            report_image_url = request.build_absolute_uri(report.image.url) if report.image else ''
            claims = list(report.claims.all())

            if not claims:
                rows.append({
                    'date_reported': report.date_reported.strftime('%Y-%m-%d'),
                    'record_type': report.type,
                    'report_id': report.id,
                    'item_name': report.item_name,
                    'category': report.category,
                    'location': report.location,
                    'report_status': report.status,
                    'report_description': report.description,
                    'item_image_url': report_image_url,
                    'reporter_name': reporter_name,
                    'reporter_school_id': reporter.school_id,
                    'reporter_role': reporter.role,
                    'reporter_email': reporter.email,
                    'claim_id': '',
                    'claim_status': '',
                    'claimed_at': '',
                    'claimant_name': '',
                    'claimant_school_id': '',
                    'claimant_email': '',
                    'claim_proof_image_url': '',
                    'claimant_photo_url': '',
                })
                continue

            for claim in claims:
                claimant = claim.claimant
                claimant_name = f"{claimant.first_name} {claimant.last_name}".strip() or claimant.username
                claim_proof_image_url = request.build_absolute_uri(claim.proof_image.url) if claim.proof_image else ''
                claimant_photo_url = request.build_absolute_uri(claim.claimant_photo.url) if claim.claimant_photo else ''
                rows.append({
                    'date_reported': report.date_reported.strftime('%Y-%m-%d'),
                    'record_type': report.type,
                    'report_id': report.id,
                    'item_name': report.item_name,
                    'category': report.category,
                    'location': report.location,
                    'report_status': report.status,
                    'report_description': report.description,
                    'item_image_url': report_image_url,
                    'reporter_name': reporter_name,
                    'reporter_school_id': reporter.school_id,
                    'reporter_role': reporter.role,
                    'reporter_email': reporter.email,
                    'claim_id': claim.id,
                    'claim_status': claim.status,
                    'claimed_at': claim.date_created.strftime('%Y-%m-%d'),
                    'claimant_name': claimant_name,
                    'claimant_school_id': claimant.school_id,
                    'claimant_email': claimant.email,
                    'claim_proof_image_url': claim_proof_image_url,
                    'claimant_photo_url': claimant_photo_url,
                })

        return Response({
            'filters': {
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
                'category': category,
                'timeframe': timeframe,
            },
            'rows': rows,
        }, status=status.HTTP_200_OK)


# --- COMPREHENSIVE LOST & FOUND DASHBOARD API ---
class LostFoundDashboardView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, format=None):
        # 1. Overall Summary Metrics
        total_lost = Report.objects.filter(type='Lost').count()
        total_found = Report.objects.filter(type='Found').count()
        total_returned = Report.objects.filter(status='Claimed').count()
        unclaimed = Report.objects.filter(type='Found').exclude(status='Claimed').count()
        
        # Average time to return (from report to claim approval)
        returned_claims = Claim.objects.filter(status='Claimed')
        return_times = []
        for claim in returned_claims:
            if claim.report.date_reported and claim.date_created:
                days = (claim.date_created.date() - claim.report.date_reported.date()).days
                if days >= 0:
                    return_times.append(days)
        avg_return_time = sum(return_times) / len(return_times) if return_times else 0
        
        # 2. Category Analytics
        category_counts = Report.objects.values('category').annotate(
            lost_count=Count('id', filter=Q(type='Lost')),
            found_count=Count('id', filter=Q(type='Found'))
        ).order_by('-lost_count', '-found_count')
        
        # Top lost/found items
        top_lost_items = Report.objects.filter(type='Lost').values('item_name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        top_found_items = Report.objects.filter(type='Found').values('item_name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Category trends over time (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        category_trends = (
            Report.objects.filter(date_reported__gte=thirty_days_ago)
            .annotate(day=TruncDay('date_reported'))
            .values('day', 'category', 'type')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        
        # 3. Location Analytics
        location_lost = Report.objects.filter(type='Lost').values('location').annotate(
            count=Count('id')
        ).order_by('-count')[:20]
        
        location_found = Report.objects.filter(type='Found').values('location').annotate(
            count=Count('id')
        ).order_by('-count')[:20]
        
        # 4. User/Reporter Analytics
        users_reporting_lost = Report.objects.filter(type='Lost').values('reporter').distinct().count()
        users_reporting_found = Report.objects.filter(type='Found').values('reporter').distinct().count()
        
        # Repeat users (users with 3+ reports)
        repeat_users_data = (
            Report.objects.values('reporter')
            .annotate(report_count=Count('id'))
            .filter(report_count__gte=3)
            .order_by('-report_count')[:20]
        )
        repeat_users = []
        for item in repeat_users_data:
            try:
                user = User.objects.get(id=item['reporter'])
                repeat_users.append({
                    'reporter': item['reporter'],
                    'reporter__username': user.username,
                    'report_count': item['report_count']
                })
            except User.DoesNotExist:
                continue
        
        # Average response time per user (time from report to first action)
        user_response_times = []
        for user in User.objects.all():
            user_reports = Report.objects.filter(reporter=user)
            if user_reports.exists():
                first_report = user_reports.order_by('date_reported').first()
                if first_report.date_reported:
                    # Calculate time to first status change or claim
                    first_action = None
                    claims = Claim.objects.filter(report__reporter=user)
                    if claims.exists():
                        first_action = claims.order_by('date_created').first().date_created
                    if first_action:
                        hours = (first_action - first_report.date_reported).total_seconds() / 3600
                        user_response_times.append({
                            'user_id': user.id,
                            'username': user.username,
                            'response_hours': round(hours, 1)
                        })
        
        avg_response_time = sum(u['response_hours'] for u in user_response_times) / len(user_response_times) if user_response_times else 0
        
        # 5. Time-Based Insights
        # Daily trends (last 30 days)
        daily_trends = (
            Report.objects.filter(date_reported__gte=thirty_days_ago)
            .annotate(day=TruncDay('date_reported'))
            .values('day', 'type')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        
        # Peak times (by hour of day)
        peak_times = (
            Report.objects.annotate(hour=TruncHour('date_reported'))
            .values('hour', 'type')
            .annotate(count=Count('id'))
            .order_by('hour')
        )
        
        # 6. Recovery Rate & Efficiency
        recovery_rate = (total_returned / total_lost * 100) if total_lost > 0 else 0
        
        # Items stuck in system (pending for more than 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        stuck_items = Report.objects.filter(
            status='Pending',
            date_reported__lt=seven_days_ago
        ).count()
        
        # 7. Alerts/Anomalies
        # Unusually high number of items lost (more than 2x average in last 7 days)
        last_7_days = timezone.now() - timedelta(days=7)
        recent_lost = Report.objects.filter(type='Lost', date_reported__gte=last_7_days).count()
        avg_daily_lost = total_lost / 365 if total_lost > 0 else 0
        high_loss_alert = recent_lost > (avg_daily_lost * 2 * 7)
        
        # Items found but not claimed for 14+ days
        fourteen_days_ago = timezone.now() - timedelta(days=14)
        unclaimed_old = Report.objects.filter(
            type='Found',
            status__in=['Pending', 'Verified'],
            date_reported__lt=fourteen_days_ago
        ).count()
        
        # Format data for frontend
        formatted_category_trends = {}
        for trend in category_trends:
            day_str = trend['day'].strftime('%Y-%m-%d') if hasattr(trend['day'], 'strftime') else str(trend['day'])
            key = f"{day_str}_{trend['category']}"
            if key not in formatted_category_trends:
                formatted_category_trends[key] = {
                    'day': day_str,
                    'category': trend['category'],
                    'lost': 0,
                    'found': 0
                }
            if trend['type'] == 'Lost':
                formatted_category_trends[key]['lost'] = trend['count']
            else:
                formatted_category_trends[key]['found'] = trend['count']
        
        formatted_daily_trends = {}
        for trend in daily_trends:
            day_str = trend['day'].strftime('%Y-%m-%d') if hasattr(trend['day'], 'strftime') else str(trend['day'])
            if day_str not in formatted_daily_trends:
                formatted_daily_trends[day_str] = {'day': day_str, 'lost': 0, 'found': 0}
            formatted_daily_trends[day_str][trend['type'].lower()] = trend['count']
        
        formatted_peak_times = {}
        for peak in peak_times:
            hour = peak['hour'].hour if hasattr(peak['hour'], 'hour') else int(str(peak['hour']).split(':')[0])
            if hour not in formatted_peak_times:
                formatted_peak_times[hour] = {'hour': hour, 'lost': 0, 'found': 0}
            formatted_peak_times[hour][peak['type'].lower()] = peak['count']
        
        data = {
            # Summary Metrics
            'summary': {
                'totalLost': total_lost,
                'totalFound': total_found,
                'totalReturned': total_returned,
                'unclaimed': unclaimed,
                'avgReturnTime': round(avg_return_time, 1),
            },
            # Category Analytics
            'categories': list(category_counts),
            'topLostItems': list(top_lost_items),
            'topFoundItems': list(top_found_items),
            'categoryTrends': list(formatted_category_trends.values()),
            # Location Analytics
            'locationLost': list(location_lost),
            'locationFound': list(location_found),
            # User Analytics
            'usersReportingLost': users_reporting_lost,
            'usersReportingFound': users_reporting_found,
            'repeatUsers': list(repeat_users),
            'avgResponseTime': round(avg_response_time, 1),
            # Time-Based Insights
            'dailyTrends': list(formatted_daily_trends.values()),
            'peakTimes': list(formatted_peak_times.values()),
            # Recovery Metrics
            'recoveryRate': round(recovery_rate, 1),
            'stuckItems': stuck_items,
            # Alerts
            'alerts': {
                'highLossAlert': high_loss_alert,
                'recentLostCount': recent_lost,
                'unclaimedOld': unclaimed_old,
            }
        }
        
        return Response(data, status=status.HTTP_200_OK)
