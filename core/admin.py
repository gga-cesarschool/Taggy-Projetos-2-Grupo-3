from django.contrib import admin
from .models import UserProfile, Vehicle, Passage, MonthlyStatistic, FAQ


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'user_type', 'total_passages', 'total_co2_saved']
    list_filter = ['user_type']


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'category', 'fuel', 'plate', 'is_primary', 'total_passages']
    list_filter = ['category', 'fuel']
    search_fields = ['name', 'plate', 'user__username']


@admin.register(Passage)
class PassageAdmin(admin.ModelAdmin):
    list_display = ['user', 'vehicle', 'context', 'quantity', 'co2_saved', 'date']
    list_filter = ['context', 'date']
    date_hierarchy = 'date'


@admin.register(MonthlyStatistic)
class MonthlyStatisticAdmin(admin.ModelAdmin):
    list_display = ['user', 'year', 'month', 'total_passages', 'total_co2_saved']


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'category', 'order', 'is_active']
    list_filter = ['category', 'is_active']
    list_editable = ['order', 'is_active']
