from django.contrib import admin
from .models import Report

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'type', 'status', 'reporter', 'date_reported', 'location')
    list_filter = ('type', 'status')
    search_fields = ('item_name', 'description')
    readonly_fields = ('reporter', 'date_reported')
