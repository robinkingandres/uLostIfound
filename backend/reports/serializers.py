from rest_framework import serializers
from .models import Report

class ReportSerializer(serializers.ModelSerializer):
    # Read-only fields derived from the User model
    reporterName = serializers.SerializerMethodField(read_only=True)
    reporterRole = serializers.SerializerMethodField(read_only=True)
    
    # Field mapping to match frontend structure (itemTitle in forms maps to itemName in type)
    itemName = serializers.CharField(source='item_name', required=True)
    date = serializers.DateField(source='date_lost_or_found', required=True)

    class Meta:
        model = Report
        fields = [
            'id', 
            'reporter', 
            'reporterName',
            'reporterRole', 
            'itemName', 
            'description', 
            'type', 
            'category', 
            'location', 
            'status', 
            'date',
            'image',
            'date_reported'
        ]
        read_only_fields = ['id', 'reporter', 'reporterName', 'reporterRole', 'date_reported']

    def get_reporterName(self, obj):
        # Uses the logic similar to your existing UserSerializer
        user = obj.reporter
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username

    def get_reporterRole(self, obj):
        return obj.reporter.role
        
    def create(self, validated_data):
        # We need to correctly map the frontend's 'itemName' back to the model's 'item_name' field
        validated_data['item_name'] = validated_data.pop('item_name')
        # Map 'date' back to 'date_lost_or_found'
        validated_data['date_lost_or_found'] = validated_data.pop('date_lost_or_found')

        return super().create(validated_data)