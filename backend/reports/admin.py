from django.contrib import admin
from .models import Report, Claim, AIMatch

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'type', 'status', 'reporter', 'date_reported', 'location')
    list_filter = ('type', 'status')
    search_fields = ('item_name', 'description')
    readonly_fields = ('reporter', 'date_reported')

@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_item_name', 'claimant', 'status', 'date_created')
    list_filter = ('status', 'date_created')
    search_fields = ('report__item_name', 'claimant__username', 'proof_description')
    readonly_fields = ('date_created',)

    def get_item_name(self, obj):
        return obj.report.item_name
    get_item_name.short_description = 'Item Name'


@admin.register(AIMatch)
class AIMatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_lost_item', 'get_found_item', 'match_score', 'visual_score', 'text_score', 'status', 'date_created')
    list_filter = ('status', 'date_created')
    search_fields = ('lost_report__item_name', 'found_report__item_name')
    readonly_fields = ('visual_score', 'text_score', 'match_score', 'date_created', 'date_updated')
    
    def get_lost_item(self, obj):
        return obj.lost_report.item_name
    get_lost_item.short_description = 'Lost Item'
    
    def get_found_item(self, obj):
        return obj.found_report.item_name
    get_found_item.short_description = 'Found Item'