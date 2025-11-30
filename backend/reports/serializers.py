from rest_framework import serializers
from .models import Report, Claim, Notification # Import Notification

class ReportSerializer(serializers.ModelSerializer):
    # ... (Keep existing ReportSerializer code unchanged) ...
    reporterName = serializers.SerializerMethodField(read_only=True)
    reporterRole = serializers.SerializerMethodField(read_only=True)
    itemName = serializers.CharField(source='item_name', required=True)
    date = serializers.DateField(source='date_lost_or_found', required=True)

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reporterName', 'reporterRole', 
            'itemName', 'description', 'type', 'category', 
            'location', 'status', 'date', 'image', 'date_reported'
        ]
        read_only_fields = ['id', 'reporter', 'reporterName', 'reporterRole', 'date_reported']

    def get_reporterName(self, obj):
        user = obj.reporter
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username

    def get_reporterRole(self, obj):
        return obj.reporter.role
        
    def create(self, validated_data):
        validated_data['item_name'] = validated_data.pop('item_name')
        validated_data['date_lost_or_found'] = validated_data.pop('date_lost_or_found')
        return super().create(validated_data)

# --- NEW CLAIM SERIALIZER ---
class ClaimSerializer(serializers.ModelSerializer):
    # Read-only fields for display
    itemName = serializers.CharField(source='report.item_name', read_only=True)
    claimantName = serializers.SerializerMethodField(read_only=True)
    claimantRole = serializers.CharField(source='claimant.role', read_only=True)
    date = serializers.DateTimeField(source='date_created', format="%Y-%m-%d", read_only=True)
    
    # Input field mapping
    proofDescription = serializers.CharField(source='proof_description', required=True)
    reportId = serializers.PrimaryKeyRelatedField(
        queryset=Report.objects.all(), source='report', write_only=True
    )

    class Meta:
        model = Claim
        fields = [
            'id', 'reportId', 'itemName', 'claimantName', 
            'claimantRole', 'proofDescription', 'status', 'date'
        ]
        read_only_fields = ['id', 'itemName', 'claimantName', 'claimantRole', 'status', 'date']

    def get_claimantName(self, obj):
        user = obj.claimant
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username
    
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at', 'report']