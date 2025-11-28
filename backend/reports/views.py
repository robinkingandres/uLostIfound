from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from .models import Report
from .serializers import ReportSerializer
# Import get_user_model to check user role/type
from django.contrib.auth import get_user_model 

# Load the custom user model once
User = get_user_model() 

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