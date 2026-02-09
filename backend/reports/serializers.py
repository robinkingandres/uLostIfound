from rest_framework import serializers
from .models import Report, Claim, Notification, AIMatch

class ReportSerializer(serializers.ModelSerializer):
    # ... (Keep existing ReportSerializer code unchanged) ...
    reporterName = serializers.SerializerMethodField(read_only=True)
    reporterRole = serializers.SerializerMethodField(read_only=True)
    
    # --- NEW FIELDS ---
    reporterSchoolId = serializers.CharField(source='reporter.school_id', read_only=True)
    reporterUsername = serializers.CharField(source='reporter.username', read_only=True)
    # ------------------

    itemName = serializers.CharField(source='item_name', required=True)
    date = serializers.DateField(source='date_lost_or_found', required=True)

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reporterName', 'reporterRole', 
            'reporterSchoolId', 'reporterUsername', # <-- Added here
            'itemName', 'description', 'type', 'category', 
            'location', 'status', 'date', 'image', 'date_reported'
        ]
        read_only_fields = ['id', 'reporter', 'reporterName', 'reporterRole', 'reporterSchoolId', 'reporterUsername', 'date_reported']

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
    proofImage = serializers.ImageField(source='proof_image', required=False, allow_null=True)
    reportId = serializers.PrimaryKeyRelatedField(
        queryset=Report.objects.all(), source='report', write_only=True
    )

    class Meta:
        model = Claim
        fields = [
            'id', 'reportId', 'itemName', 'claimantName', 
            'claimantRole', 'proofDescription', 'proofImage', 'status', 'date','rejection_reason'
        ]
        read_only_fields = ['id', 'itemName', 'claimantName', 'claimantRole', 'date']

    def get_claimantName(self, obj):
        user = obj.claimant
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username
    
    def validate(self, attrs):
        # Get the report object from the input data
        report = attrs.get('report')
        request = self.context.get('request')

        # Check if the claimant is the same as the reporter
        if report and request and request.user == report.reporter:
            raise serializers.ValidationError("You cannot claim an item you reported.")
            
        return attrs
    
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at', 'report']


# --- AI MATCH SERIALIZER ---
class AIMatchItemSerializer(serializers.ModelSerializer):
    """Serializer for individual items in a match."""
    reporterId = serializers.IntegerField(source='reporter.id', read_only=True)
    reporterName = serializers.SerializerMethodField(read_only=True)
    itemName = serializers.CharField(source='item_name', read_only=True)
    
    class Meta:
        model = Report
        fields = ['id', 'itemName', 'description', 'category', 'location', 'image', 'reporterId', 'reporterName']
    
    def get_reporterName(self, obj):
        user = obj.reporter
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username


class AIMatchSerializer(serializers.ModelSerializer):
    """Serializer for AI Match results."""
    lostItem = AIMatchItemSerializer(source='lost_report', read_only=True)
    foundItem = AIMatchItemSerializer(source='found_report', read_only=True)
    visualScore = serializers.FloatField(source='visual_score', read_only=True)
    textScore = serializers.FloatField(source='text_score', read_only=True)
    matchScore = serializers.FloatField(source='match_score', read_only=True)
    date = serializers.DateTimeField(source='date_created', format="%m-%d-%y", read_only=True)
    
    class Meta:
        model = AIMatch
        fields = [
            'id', 'lostItem', 'foundItem', 'visualScore', 'textScore', 
            'matchScore', 'status', 'date', 'lost_reporter_notified', 'found_reporter_notified'
        ]
        read_only_fields = ['id', 'lostItem', 'foundItem', 'visualScore', 'textScore', 'matchScore', 'date']