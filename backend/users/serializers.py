from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    # Map backend fields to frontend expected keys
    userId = serializers.CharField(source='school_id', read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'userId', 'email', 'role', 'username', 'avatar', 'password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'email': {'required': True}
        }

    def get_name(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name if full_name else obj.username

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