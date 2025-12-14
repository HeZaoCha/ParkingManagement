"""
通知系统管理后台
"""
from django.contrib import admin

from apps.notifications.models import Notification, NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """通知管理"""
    list_display = ['user', 'title', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['user__username', 'title', 'message']
    readonly_fields = ['created_at', 'updated_at', 'read_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('基本信息', {
            'fields': ('user', 'title', 'message', 'notification_type')
        }),
        ('状态', {
            'fields': ('is_read', 'read_at')
        }),
        ('关联信息', {
            'fields': ('link', 'related_object_type', 'related_object_id')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    """通知模板管理"""
    list_display = ['name', 'notification_type', 'description', 'updated_at']
    list_filter = ['notification_type', 'created_at']
    search_fields = ['name', 'description', 'title_template', 'message_template']
    readonly_fields = ['created_at', 'updated_at']
