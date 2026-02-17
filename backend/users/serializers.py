from rest_framework import serializers
from django.conf import settings
from .models import User, SiteSettings, Category

class UserSerializer(serializers.ModelSerializer):
    # Map backend fields to frontend expected keys
    userId = serializers.CharField(source='school_id', read_only=True)
    name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    school_id = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'name', 'userId', 'email', 'role', 'username',
            'first_name', 'last_name',  # writable for profile edit
            'year_level', 'room', 'gender',
            'avatar', 'avatar_url', 'password', 'school_id'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'email': {'required': True},
            'avatar': {'write_only': False, 'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'year_level': {'required': False},
            'room': {'required': False},
            'gender': {'required': False},
        }

    def get_name(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name if full_name else obj.username

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            # Fallback for when request context is not available
            return f"http://localhost:8000{settings.MEDIA_URL}{obj.avatar}"
        return None

    def to_representation(self, instance):
        """
        Override to include avatar_url in the response and remove avatar field (which contains the file path).
        """
        representation = super().to_representation(instance)
        # Replace avatar with avatar_url for frontend
        if 'avatar_url' in representation:
            representation['avatar'] = representation.pop('avatar_url')
        # Remove the raw avatar field path
        if 'avatar' in representation and not representation['avatar']:
            representation['avatar'] = None
        return representation

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        # Ensure we read school_id, which might come in as school_id or userId depending on how it's POSTed
        school_id = validated_data.pop('school_id', None) or validated_data.pop('userId', None)
        
        user = User(school_id=school_id, **validated_data)
        
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
            
        user.save()
        return user

    def update(self, instance, validated_data):
        # --- FIX 1: Handle password hashing ---
        password = validated_data.pop('password', None)
        
        # --- FIX 2: Safely update the unique school_id field ---
        # DRF often prevents saving a unique field even if its value hasn't changed 
        # in the instance. We manually handle it here.
        school_id_value = validated_data.pop('school_id', None)
        if school_id_value is not None:
            instance.school_id = school_id_value

        # Update remaining attributes
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        instance.save()
        
        # --- FIX 3: Ensure school_id is available in the returned object ---
        # We need to manually set the output field 'userId' back onto the instance object 
        # before returning, because it's a SerializerMethodField.
        # This ensures the API response is complete, allowing React to update its state correctly.
        instance.userId = instance.school_id # Note: This is Python-side manipulation for the response
        
        return instance


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'sort_order', 'is_active']


class SiteSettingsSerializer(serializers.ModelSerializer):
    categories = serializers.SerializerMethodField()
    org_logo_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = [
            'id',
            'org_name',
            'org_tagline',
            'org_logo',
            'org_logo_url',
            'default_new_report_status',
            'home_visible_report_statuses',
            'claim_require_proof_image',
            'ai_min_score',
            'ai_matching_enabled',
            'user_home_chatbot_visible',
            'user_home_chat_notification_dot',
            'email_master_enabled',
            'email_notify_verified_reports',
            'email_notify_claim_results',
            'categories',
            'updated_at',
        ]
        read_only_fields = ['updated_at', 'categories', 'org_logo_url']

    def get_categories(self, _obj):
        categories = Category.objects.filter(is_active=True).order_by('sort_order', 'name')
        return CategorySerializer(categories, many=True).data

    def get_org_logo_url(self, obj):
        if not obj.org_logo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.org_logo.url)
        return f"http://localhost:8000{settings.MEDIA_URL}{obj.org_logo}"
