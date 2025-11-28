from rest_framework import viewsets, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
# Use the correct Django imports
from django.contrib.auth import authenticate, login, logout, get_user_model 
from django.middleware.csrf import get_token # <-- ADD THIS IMPORT
# REMOVED: from django.views.decorators.csrf import csrf_protect
# REMOVED: from django.utils.decorators import method_decorator
from .serializers import UserSerializer

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
    
    # Add search capability (e.g. search by name or ID)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'first_name', 'last_name', 'school_id', 'email']
    ordering_fields = ['date_joined', 'role']