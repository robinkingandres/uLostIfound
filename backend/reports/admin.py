from django.contrib import admin
from .models import Report, Claim # Import Claim

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'type', 'status', 'reporter', 'date_reported', 'location')
    list_filter = ('type', 'status')
    search_fields = ('item_name', 'description')
    readonly_fields = ('reporter', 'date_reported')

# --- NEW: Register the Claim Model ---
@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    # Columns to show in the list view
    list_display = ('id', 'get_item_name', 'claimant', 'status', 'date_created')
    
    # Filters sidebar
    list_filter = ('status', 'date_created')
    
    # Search bar (searches item name, username, or proof description)
    search_fields = ('report__item_name', 'claimant__username', 'proof_description')
    
    # Prevent editing the creation date
    readonly_fields = ('date_created',)

    # Helper to show the item name (since it's a foreign key)
    def get_item_name(self, obj):
        return obj.report.item_name
    get_item_name.short_description = 'Item Name'