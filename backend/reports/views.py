from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from .models import Report
from .serializers import ReportSerializer
# Import get_user_model to check user role/type
from django.contrib.auth import get_user_model 

# Load the custom user model once
User = get_user_model() 

from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Report, Claim  # Added Claim
from .serializers import ReportSerializer, ClaimSerializer # Added ClaimSerializer
from django.contrib.auth import get_user_model 

# Load the custom user model once
User = get_user_model() 

# --- New: Permission Class for Admin Access Only ---
class IsAdmin(permissions.BasePermission):
    """
    Custom permission to only allow users with role 'Admin' to access.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any request, so we'll always allow GET, HEAD, or OPTIONS requests.
        # But for this specific view, we enforce authentication and role check.
        return request.user.is_authenticated and request.user.role == 'Admin'

# --- New: Dashboard Stats API View ---
class DashboardStatsView(APIView):
    permission_classes = [IsAdmin] # Only Admins can access this view

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


# Existing ReportViewSet (keep below the custom views)
class ReportViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Lost and Found Reports (CRUD operations).
    Allows filtering by type ('Lost'/'Found') and status.
    """
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    # Require authentication for creating a report, but allow read-only access to anyone.
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    # Enable search on item details and reporter details (username/school_id)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['item_name', 'description', 'location', 'category', 'reporter__username', 'reporter__school_id']
    ordering_fields = ['date_reported', 'type', 'status']

    def perform_create(self, serializer):
        # Automatically set the reporter to the logged-in user before saving
        serializer.save(reporter=self.request.user)

    def get_queryset(self):
        # Start with the base queryset
        queryset = self.queryset
        
        # --- FIX (from previous turn): Bypass status filtering if we are looking up a single object by ID (detail view) ---
        if self.detail:
            return queryset
            
        report_type = self.request.query_params.get('type')
        status_filter = self.request.query_params.get('status')
        
        # Check if the user is an authenticated Admin
        is_admin = self.request.user.is_authenticated and self.request.user.role == 'Admin'

        # 1. Apply filter by requested report type
        if report_type:
            queryset = queryset.filter(type=report_type)
            
        # 2. Apply filter by requested status, or default to 'Verified'
        if status_filter:
            # If an explicit status is given (e.g., from admin panel filters), use it
            queryset = queryset.filter(status=status_filter)
        elif not is_admin:
            # Default behavior for public non-admin access: only show 'Verified' reports.
            queryset = queryset.filter(status='Verified')
            
        return queryset
    
    # Custom action to allow authenticated users to view only their reports
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_reports(self, request):
        queryset = self.get_queryset().filter(reporter=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class ReportViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Lost and Found Reports (CRUD operations).
    Allows filtering by type ('Lost'/'Found') and status.
    """
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    # Require authentication for creating a report, but allow read-only access to anyone.
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    # Enable search on item details and reporter details (username/school_id)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['item_name', 'description', 'location', 'category', 'reporter__username', 'reporter__school_id']
    ordering_fields = ['date_reported', 'type', 'status']

    def perform_create(self, serializer):
        # Automatically set the reporter to the logged-in user before saving
        serializer.save(reporter=self.request.user)

    def get_queryset(self):
        # Start with the base queryset
        queryset = self.queryset
        
        # --- FIX: Bypass status filtering if we are looking up a single object by ID (detail view) ---
        if self.detail:
            return queryset
            
        report_type = self.request.query_params.get('type')
        status_filter = self.request.query_params.get('status')
        
        is_admin = self.request.user.is_authenticated and self.request.user.role == 'Admin'

        # 1. Apply filter by requested report type
        if report_type:
            queryset = queryset.filter(type=report_type)
            
        # 2. Apply filter by requested status, or default to 'Verified'
        if status_filter:
            # If an explicit status is given (e.g., from admin panel filters), use it
            queryset = queryset.filter(status=status_filter)
        elif not is_admin:
            # Default behavior for public non-admin access: only show 'Verified' reports.
            queryset = queryset.filter(status='Verified')
            
        return queryset
    
    # Custom action to allow authenticated users to view only their reports
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_reports(self, request):
        queryset = self.get_queryset().filter(reporter=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    # --- NEW CLAIM VIEWSET ---
class ClaimViewSet(viewsets.ModelViewSet):
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Automatically set the claimant to the current user
        serializer.save(claimant=self.request.user)

    def get_queryset(self):
        # Admins see all claims, regular users only see their own
        user = self.request.user
        if user.role == 'Admin':
            return Claim.objects.all()
        return Claim.objects.filter(claimant=user)