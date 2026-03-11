from rest_framework import serializers
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Report, Claim, Notification, AIMatch
from users.models import SiteSettings
User = get_user_model()

class ReportSerializer(serializers.ModelSerializer):
    # ... (Keep existing ReportSerializer code unchanged) ...
    reporterName = serializers.SerializerMethodField(read_only=True)
    reporterRole = serializers.SerializerMethodField(read_only=True)
    reporterAvatar = serializers.SerializerMethodField(read_only=True)
    
    # --- NEW FIELDS ---
    reporterSchoolId = serializers.CharField(source='reporter.school_id', read_only=True)
    reporterUsername = serializers.CharField(source='reporter.username', read_only=True)
    isMatched = serializers.SerializerMethodField(read_only=True)
    publicStatus = serializers.SerializerMethodField(read_only=True)
    claimantName = serializers.SerializerMethodField(read_only=True)
    claimantPhoto = serializers.SerializerMethodField(read_only=True)
    claimantContact = serializers.SerializerMethodField(read_only=True)
    # ------------------

    itemName = serializers.CharField(source='item_name', required=True)
    personName = serializers.CharField(source='person_name', required=False, allow_blank=True)
    date = serializers.DateField(source='date_lost_or_found', required=True)
    returnedByPhoto = serializers.ImageField(source='returned_by_photo', required=False, allow_null=True)

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reporterName', 'reporterRole', 'reporterAvatar',
            'reporterSchoolId', 'reporterUsername',
            'isMatched', 'publicStatus',
            'claimantName', 'claimantPhoto', 'claimantContact',
            'itemName', 'personName', 'description', 'type', 'category', 
            'location', 'status', 'date', 'image', 'returnedByPhoto', 'date_reported'
        ]
        read_only_fields = ['id', 'reporter', 'reporterName', 'reporterRole', 'reporterSchoolId', 'reporterUsername', 'date_reported']

    def get_reporterName(self, obj):
        user = obj.reporter
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username

    def get_reporterRole(self, obj):
        return obj.reporter.role

    def get_reporterAvatar(self, obj):
        avatar = obj.reporter.avatar
        if avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(avatar.url)
            return avatar.url if avatar else None
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        photo = instance.returned_by_photo
        if not photo:
            data['returnedByPhoto'] = None
            return data
        request = self.context.get('request')
        data['returnedByPhoto'] = request.build_absolute_uri(photo.url) if request else photo.url
        return data

    def get_isMatched(self, obj):
        annotated = getattr(obj, 'has_active_match', None)
        if annotated is not None:
            return bool(annotated)
        return AIMatch.objects.filter(
            Q(lost_report=obj) | Q(found_report=obj)
        ).exclude(status='Rejected').exists()

    def get_publicStatus(self, obj):
        if obj.status == 'Claimed':
            return 'Claimed'
        if self.get_isMatched(obj):
            return 'Matched'
        return obj.type

    def _get_claimed_claim(self, obj):
        claimed = obj.claims.filter(status='Claimed').order_by('-date_created').first()
        if claimed:
            return claimed
        return obj.claims.order_by('-date_created').first()

    def get_claimantName(self, obj):
        claim = self._get_claimed_claim(obj)
        if not claim:
            return None
        if claim.claimant_full_name:
            return claim.claimant_full_name
        if claim.claimant:
            full_name = f"{claim.claimant.first_name} {claim.claimant.last_name}".strip()
            return full_name if full_name else claim.claimant.username
        return None

    def get_claimantPhoto(self, obj):
        claim = self._get_claimed_claim(obj)
        if not claim or not claim.claimant_photo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(claim.claimant_photo.url)
        return claim.claimant_photo.url

    def get_claimantContact(self, obj):
        claim = self._get_claimed_claim(obj)
        if not claim:
            return None
        return claim.claimant_contact or None
        
    def create(self, validated_data):
        validated_data['item_name'] = validated_data.pop('item_name')
        validated_data['date_lost_or_found'] = validated_data.pop('date_lost_or_found')
        return super().create(validated_data)

    def validate(self, attrs):
        report_type = attrs.get('type')
        person_name = (attrs.get('person_name') or '').strip()
        if self.instance is None and report_type == 'Lost' and not person_name:
            raise serializers.ValidationError({'personName': 'Person name is required for lost reports.'})
        request = self.context.get('request')
        if self.instance is None and report_type == 'Found' and request:
            user = request.user
            if getattr(user, 'role', None) == 'Guidance' and not attrs.get('returned_by_photo'):
                raise serializers.ValidationError({'returnedByPhoto': 'Returned By photo is required for Guidance reports.'})
        return attrs

# --- NEW CLAIM SERIALIZER ---
class ClaimSerializer(serializers.ModelSerializer):
    # Read-only fields for display
    itemName = serializers.CharField(source='report.item_name', read_only=True)
    claimantName = serializers.SerializerMethodField(read_only=True)
    claimantRole = serializers.SerializerMethodField(read_only=True)
    date = serializers.DateTimeField(source='date_created', format="%Y-%m-%d", read_only=True)
    reportRecordId = serializers.IntegerField(source='report.id', read_only=True)
    reportType = serializers.CharField(source='report.type', read_only=True)
    reportCategory = serializers.CharField(source='report.category', read_only=True)
    reportLocation = serializers.CharField(source='report.location', read_only=True)
    reportStatus = serializers.CharField(source='report.status', read_only=True)
    reportDescription = serializers.CharField(source='report.description', read_only=True)
    reportDate = serializers.DateField(source='report.date_lost_or_found', format="%Y-%m-%d", read_only=True)
    reportDateReported = serializers.DateTimeField(source='report.date_reported', format="%Y-%m-%d", read_only=True)
    reportImage = serializers.SerializerMethodField(read_only=True)
    reporterName = serializers.SerializerMethodField(read_only=True)
    reporterRole = serializers.CharField(source='report.reporter.role', read_only=True)
    reporterSchoolId = serializers.CharField(source='report.reporter.school_id', read_only=True)
    
    # Input field mapping
    proofDescription = serializers.CharField(source='proof_description', required=True)
    proofImage = serializers.ImageField(source='proof_image', required=False, allow_null=True)
    claimantPhoto = serializers.ImageField(source='claimant_photo', required=False, allow_null=True)
    claimantIdPhoto = serializers.ImageField(source='claimant_id_photo', required=False, allow_null=True)
    authorizationLetter = serializers.ImageField(source='authorization_letter', required=False, allow_null=True)
    claimantContact = serializers.CharField(source='claimant_contact', required=False, allow_blank=True)
    proof_image = serializers.SerializerMethodField(read_only=True)
    claimant_photo = serializers.SerializerMethodField(read_only=True)
    claimant_id_photo = serializers.SerializerMethodField(read_only=True)
    authorization_letter = serializers.SerializerMethodField(read_only=True)
    reportId = serializers.PrimaryKeyRelatedField(
        queryset=Report.objects.all(), source='report', write_only=True
    )
    claimantId = serializers.IntegerField(write_only=True, required=False)
    claimantNameInput = serializers.CharField(source='claimant_full_name', write_only=True, required=False, allow_blank=True)
    claimantSchoolIdInput = serializers.CharField(source='claimant_school_id', write_only=True, required=False, allow_blank=True)
    claimantSchoolId = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Claim
        fields = [
            'id', 'reportId', 'itemName', 'claimantName', 
            'claimantRole', 'claimantSchoolId', 'proofDescription', 'proofImage', 'proof_image',
            'claimantPhoto', 'claimant_photo',
            'claimantIdPhoto', 'claimant_id_photo',
            'authorizationLetter', 'authorization_letter',
            'claimantContact',
            'claimantId', 'claimantNameInput', 'claimantSchoolIdInput',
            'status', 'date', 'rejection_reason',
            'reportRecordId', 'reportType', 'reportCategory', 'reportLocation', 'reportStatus',
            'reportDescription', 'reportDate', 'reportDateReported', 'reportImage',
            'reporterName', 'reporterRole', 'reporterSchoolId'
        ]
        read_only_fields = ['id', 'itemName', 'claimantName', 'claimantRole', 'date']

    def get_claimantName(self, obj):
        if obj.claimant_full_name:
            return obj.claimant_full_name
        user = obj.claimant
        if not user:
            return 'Unknown'
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username

    def get_claimantRole(self, obj):
        if obj.claimant_full_name:
            return 'Walk-in Claimant'
        return obj.claimant.role if obj.claimant else 'Unknown'

    def get_claimantSchoolId(self, obj):
        if obj.claimant_school_id:
            return obj.claimant_school_id
        return obj.claimant.school_id if obj.claimant else ''

    def create(self, validated_data):
        # Non-model helper field used by Guidance/Admin; claimant assignment is handled in the view.
        validated_data.pop('claimantId', None)
        return super().create(validated_data)

    def get_proof_image(self, obj):
        if not obj.proof_image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.proof_image.url)
        return obj.proof_image.url

    def get_claimant_photo(self, obj):
        if not obj.claimant_photo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.claimant_photo.url)
        return obj.claimant_photo.url

    def get_claimant_id_photo(self, obj):
        if not obj.claimant_id_photo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.claimant_id_photo.url)
        return obj.claimant_id_photo.url

    def get_authorization_letter(self, obj):
        if not obj.authorization_letter:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.authorization_letter.url)
        return obj.authorization_letter.url

    def get_reportImage(self, obj):
        if not obj.report.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.report.image.url)
        return obj.report.image.url

    def get_reporterName(self, obj):
        user = obj.report.reporter
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username
    
    def to_internal_value(self, data):
        # Accept snake_case payloads as aliases for camelCase fields.
        if hasattr(data, 'copy'):
            data = data.copy()
        if isinstance(data, dict):
            if 'claimant_id_photo' in data and 'claimantIdPhoto' not in data:
                data['claimantIdPhoto'] = data.get('claimant_id_photo')
            if 'authorization_letter' in data and 'authorizationLetter' not in data:
                data['authorizationLetter'] = data.get('authorization_letter')
            if 'claimant_contact' in data and 'claimantContact' not in data:
                data['claimantContact'] = data.get('claimant_contact')
        return super().to_internal_value(data)

    def validate(self, attrs):
        # Get the report object from the input data
        report = attrs.get('report')
        request = self.context.get('request')
        claimant_id = None
        if request:
            claimant_id = request.data.get('claimantId')
        is_privileged = bool(
            request and (request.user.role in ['Admin', 'Guidance'] or request.user.is_superuser)
        )
        claimant_full_name = (attrs.get('claimant_full_name') or '').strip()
        is_manual_claim = bool(is_privileged and claimant_full_name and not claimant_id)
        claimant_contact = (attrs.get('claimant_contact') or '').strip()

        claimant_user = request.user if request else None
        if claimant_id and is_privileged:
            try:
                claimant_user = User.objects.get(id=int(claimant_id))
            except Exception:
                raise serializers.ValidationError("Selected claimant is invalid.")

        # Prevent self-claim only for account-based claims.
        # Guidance/Admin manual walk-in claims are allowed even when request.user reported the item.
        if report and claimant_user and not is_manual_claim and claimant_user == report.reporter:
            raise serializers.ValidationError("You cannot claim an item you reported.")

        if self.instance is None and not claimant_contact:
            raise serializers.ValidationError({"claimantContact": "Claimant contact number is required."})

        # Block duplicate claims for the same user/report pair before DB save.
        if self.instance is None and report and request:
            if is_manual_claim:
                if Claim.objects.filter(
                    report=report,
                    claimant_full_name__iexact=claimant_full_name
                ).exists():
                    raise serializers.ValidationError(
                        "A claim for this item and claimant name already exists."
                    )
            elif claimant_user and Claim.objects.filter(report=report, claimant=claimant_user).exists():
                raise serializers.ValidationError(
                    "You already submitted a claim for this item."
                )
            if request.user.role in ['Guidance', 'Admin'] and not request.user.is_superuser:
                if not claimant_full_name:
                    raise serializers.ValidationError("Claimant name is required for manual claim reports.")

        settings_obj = SiteSettings.get_solo()
        proof_image = attrs.get('proof_image')
        claimant_photo = attrs.get('claimant_photo')
        claimant_id_photo = attrs.get('claimant_id_photo')
        if self.instance is None:
            if settings_obj.claim_require_proof_image and not proof_image:
                raise serializers.ValidationError("Proof image is required by current claim settings.")
            if not claimant_photo:
                raise serializers.ValidationError("Claimant photo is required for identity verification.")
            if not claimant_id_photo:
                raise serializers.ValidationError("Valid ID / Student ID photo is required for claim release documentation.")
            
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
    matchScore = serializers.SerializerMethodField(read_only=True)
    date = serializers.DateTimeField(source='date_created', format="%m-%d-%y", read_only=True)
    
    class Meta:
        model = AIMatch
        fields = [
            'id', 'lostItem', 'foundItem', 'visualScore', 'textScore', 
            'matchScore', 'status', 'date', 'lost_reporter_notified', 'found_reporter_notified'
        ]
        read_only_fields = ['id', 'lostItem', 'foundItem', 'visualScore', 'textScore', 'matchScore', 'date']

    def get_matchScore(self, obj):
        if obj.lost_report.status == 'Claimed' or obj.found_report.status == 'Claimed':
            return 100.0
        return min(float(obj.match_score or 0.0), 85.0)
