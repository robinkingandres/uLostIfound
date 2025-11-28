from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from django.contrib.auth import get_user_model 
from django.db.models import ObjectDoesNotExist # Import to handle missing model cleanly

# Get the configured custom user model
User = get_user_model() 

class CustomUserAuthBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in using 
    username, email, or school_id, by checking multiple fields on the User model.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        # --- DEBUG STEP: CHECK INPUT ---
        print(f"\n--- AUTH DEBUG ---")
        print(f"Attempting login with username/ID: '{username}'")
        
        if not username or not password:
            print("Authentication failed: Missing username or password.")
            return None
            
        try:
            # 1. Look up the user using case-insensitive OR logic (Q objects)
            user = User.objects.get(
                Q(username__iexact=username) |
                Q(email__iexact=username) |
                Q(school_id__iexact=username)
            )
            print(f"User found: {user.username} (ID: {user.id})")
            
            # 2. Check the password
            if user.check_password(password):
                print("Password check succeeded.")
                # 3. Check if the user is active/allowed to log in
                if self.user_can_authenticate(user):
                    print("User is active. Authentication success.")
                    print("------------------\n")
                    return user
                else:
                    print("Authentication failed: User is not active.")
                    return None
            else:
                print("Authentication failed: Password check failed.")
                return None

        except User.DoesNotExist:
            print(f"Authentication failed: No user matching '{username}' found in username, email, or school_id.")
            return None
        except Exception as e:
            print(f"An unexpected error occurred during authentication: {e}")
            return None