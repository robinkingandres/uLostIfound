import random
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets, filters, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout, get_user_model 
from django.middleware.csrf import get_token 
from .serializers import UserSerializer
from .models import PasswordResetCode # Import the new model
from core.permissions import IsAdmin

# Load the custom user model once
User = get_user_model() 

class LoginView(APIView):
    permission_classes = () # Allow any request
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        # This calls your CustomUserAuthBackend now
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # User found and session established
            login(request, user)
            
            # Use the existing UserSerializer to return user data
            serializer = UserSerializer(user)
            
            # --- FIX: Create Response object and explicitly set CSRF cookie ---
            response = Response(serializer.data)
            csrf_token = get_token(request) # Get the current token
            response.set_cookie('csrftoken', csrf_token) # Set the cookie explicitly
            
            return response
        else:
            # User not found or incorrect password/inactive account
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
    """
    # Use the User model instance loaded above
    queryset = User.objects.all() 
    serializer_class = UserSerializer
    
    # RBAC: Restrict User Management to Admins only
    permission_classes = [IsAdmin] 
    
    # Add search capability (e.g. search by name or ID)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'first_name', 'last_name', 'school_id', 'email']
    ordering_fields = ['date_joined', 'role']

class RequestPasswordResetView(APIView):
    permission_classes = () # Allow unauthenticated access

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            
            # Generate 6-digit code
            code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            
            # Delete old codes for this user
            PasswordResetCode.objects.filter(user=user).delete()
            
            # Create new code
            PasswordResetCode.objects.create(user=user, code=code)
            
            # Send Email
            send_mail(
                subject='uLostIfound - Password Reset Code',
                message=f'Your verification code is: {code}\n\nThis code expires in 15 minutes.',
                from_email=settings.EMAIL_HOST_USER,
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