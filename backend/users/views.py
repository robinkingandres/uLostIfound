import random
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
from rest_framework import viewsets, filters, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout, get_user_model 
from django.middleware.csrf import get_token 
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from .serializers import UserSerializer, SiteSettingsSerializer, CategorySerializer
from .email_utils import send_resend_email
from .models import PasswordResetCode, SiteSettings, Category # Import the new model
from core.permissions import IsAdmin

# Load the custom user model once
User = get_user_model() 

# --- NEW CSRF TOKEN VIEW ---
@ensure_csrf_cookie
def csrf_token_view(request):
    """Sends the CSRF token to the frontend as JSON."""
    return JsonResponse({'csrfToken': get_token(request)})
# ---------------------------

class LoginView(APIView):
    permission_classes = () # Allow any request
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            serializer = UserSerializer(user)
            response = Response(serializer.data)
            
            # --- FIX: Let Django's secure middleware handle the cookie ---
            # By just calling get_token, Django automatically attaches the secure 
            # cookie using the rules from settings.py!
            get_token(request) 
            
            return response
        else:
            return Response(
                {"detail": "Invalid credentials or account not active."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
class LogoutView(APIView):
    # Logout views generally still require CSRF tokens when the user is authenticated 
    # to prevent log out attacks, but we will leave it as is for simplicity.
    def post(self, request):
        logout(request)
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)

# Existing UserViewSet (keep at the bottom)
class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    Admins can manage all users, users can update their own profile.
    """
    # Use the User model instance loaded above
    queryset = User.objects.all() 
    serializer_class = UserSerializer
    
    # Add search capability (e.g. search by name or ID)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'first_name', 'last_name', 'school_id', 'email']
    ordering_fields = ['date_joined', 'role']

    def get_permissions(self):
        """
        Allow users to update their own profile, but restrict other actions to admins.
        """
        if self.action == 'list':
            user = self.request.user
            if user.is_authenticated and (user.role in ['Admin', 'Guidance'] or user.is_superuser):
                return [permissions.IsAuthenticated()]
            return [IsAdmin()]
        if self.action in ['update', 'partial_update', 'retrieve']:
            # Allow authenticated users to update/retrieve their own profile
            return [permissions.IsAuthenticated()]
        # All other actions (list, create, destroy) require admin
        return [IsAdmin()]

    def get_serializer_context(self):
        """
        Pass request context to serializer for building absolute URLs.
        """
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        """
        Users can only see their own profile unless they're admin.
        """
        user = self.request.user
        if user.role == 'Admin' or user.is_superuser:
            return User.objects.all()
        if user.role == 'Guidance':
            return User.objects.filter(
                Q(id=user.id) | Q(role__in=['Student', 'Teacher'])
            ).order_by('last_name', 'first_name', 'username')
        # Regular users can only see themselves
        return User.objects.filter(id=user.id)

    def update(self, request, *args, **kwargs):
        """
        Allow users to update their own profile, but restrict certain fields.
        """
        instance = self.get_object()
        user = request.user
        
        # Check if user is updating themselves or is admin
        if instance.id != user.id and not (user.role == 'Admin' or user.is_superuser):
            return Response(
                {"detail": "You can only update your own profile."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Non-admins cannot change role, school_id, year_level, or room.
        if user.role != 'Admin' and not user.is_superuser:
            if 'role' in request.data:
                return Response(
                    {"detail": "You cannot change your role."},
                    status=status.HTTP_403_FORBIDDEN
                )
            if 'school_id' in request.data or 'userId' in request.data:
                return Response(
                    {"detail": "You cannot change your school ID."},
                    status=status.HTTP_403_FORBIDDEN
                )
            if 'year_level' in request.data or 'yearLevel' in request.data:
                return Response(
                    {"detail": "Only admins can change year level."},
                    status=status.HTTP_403_FORBIDDEN
                )
            if 'room' in request.data:
                return Response(
                    {"detail": "Only admins can change room."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().update(request, *args, **kwargs)


class SettingsView(APIView):
    """
    Public GET for user-facing config; admin PATCH for system settings.
    """
    permission_classes = ()  # public GET handled explicitly

    def get(self, request):
        settings_obj = SiteSettings.get_solo()
        serializer = SiteSettingsSerializer(settings_obj, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        if not user.is_authenticated or (user.role != 'Admin' and not user.is_superuser):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        settings_obj = SiteSettings.get_solo()
        serializer = SiteSettingsSerializer(
            settings_obj,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class SettingsCategoriesView(APIView):
    """
    Admin-only bulk category update endpoint used by the Settings Save action.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        if user.role != 'Admin' and not user.is_superuser:
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data.get('categories', request.data)
        if not isinstance(payload, list):
            return Response({"detail": "categories must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        existing = {cat.id: cat for cat in Category.objects.all()}
        keep_ids = []

        for index, raw_item in enumerate(payload):
            if not isinstance(raw_item, dict):
                continue
            name = str(raw_item.get('name', '')).strip()
            if not name:
                continue
            sort_order = int(raw_item.get('sort_order', index))
            is_active = bool(raw_item.get('is_active', True))
            category_id = raw_item.get('id')

            category = existing.get(category_id)
            if category:
                category.name = name
                category.sort_order = sort_order
                category.is_active = is_active
                category.save(update_fields=['name', 'sort_order', 'is_active'])
                keep_ids.append(category.id)
            else:
                category = Category.objects.create(
                    name=name,
                    sort_order=sort_order,
                    is_active=is_active,
                )
                keep_ids.append(category.id)

        if keep_ids:
            Category.objects.exclude(id__in=keep_ids).delete()
        else:
            Category.objects.all().delete()

        categories = Category.objects.all().order_by('sort_order', 'name')
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SettingsAiThresholdView(APIView):
    """
    Admin-only endpoint for AI minimum score slider updates.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        if user.role != 'Admin' and not user.is_superuser:
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        min_score = request.data.get('min_score', None)
        if min_score is None:
            return Response({"detail": "min_score is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            min_score = float(min_score)
        except (TypeError, ValueError):
            return Response({"detail": "min_score must be a number."}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj = SiteSettings.get_solo()
        settings_obj.ai_min_score = max(0.0, min(100.0, min_score))
        settings_obj.save(update_fields=['ai_min_score'])

        serializer = SiteSettingsSerializer(settings_obj, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('sort_order', 'name')
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdmin()]

class RequestPasswordResetView(APIView):
    permission_classes = () # Allow unauthenticated access

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            site_settings = SiteSettings.get_solo()
            if not site_settings.email_master_enabled:
                return Response(
                    {"detail": "Email notifications are currently disabled by the administrator."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            user = User.objects.get(email=email)
            
            # Generate 6-digit code
            code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            
            # Delete old codes for this user
            PasswordResetCode.objects.filter(user=user).delete()
            
            # Create new code
            PasswordResetCode.objects.create(user=user, code=code)
            
            # Send Email
            if getattr(settings, 'RESEND_API_KEY', None):
                ok, err = send_resend_email(
                    to_email=email,
                    subject='uLostIfound - Password Reset Code',
                    text=f'Your verification code is: {code}\n\nThis code expires in 15 minutes.',
                )
                if not ok:
                    print(err)
                    return Response({"detail": "Failed to send email."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                if (
                    settings.EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend'
                    and (not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD)
                ):
                    return Response(
                        {"detail": "Email service is not configured. Please contact the administrator."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )
                send_mail(
                    subject='uLostIfound - Password Reset Code',
                    message=f'Your verification code is: {code}\n\nThis code expires in 15 minutes.',
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', settings.EMAIL_HOST_USER),
                    recipient_list=[email],
                    fail_silently=False,
                )
            
            return Response({"detail": "Verification code sent to your email."})
            
        except User.DoesNotExist:
            # For security, you might want to return 200 even if user doesn't exist, 
            # but for this project, explicit errors are easier to debug.
            return Response({"detail": "No user found with this email."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(e)
            return Response({"detail": "Failed to send email."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResetPasswordView(APIView):
    permission_classes = ()

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('password')

        if not email or not code or not new_password:
            return Response({"detail": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            reset_code = PasswordResetCode.objects.filter(user=user, code=code).first()

            if not reset_code or not reset_code.is_valid():
                return Response({"detail": "Invalid or expired verification code."}, status=status.HTTP_400_BAD_REQUEST)

            # Reset Password
            user.set_password(new_password)
            user.save()

            # Clean up used code
            reset_code.delete()

            return Response({"detail": "Password has been reset successfully. Please login."})

        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class VerifyPasswordResetCodeView(APIView):
    permission_classes = ()

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({"detail": "Email and code are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            reset_code = PasswordResetCode.objects.filter(user=user, code=code).first()

            if not reset_code or not reset_code.is_valid():
                return Response({"detail": "Invalid or expired verification code."}, status=status.HTTP_400_BAD_REQUEST)

            return Response({"detail": "Verification code is valid."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
