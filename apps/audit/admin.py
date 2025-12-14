"""
审计日志管理后台配置
"""
from django.contrib import admin

from apps.audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """审计日志管理"""
    list_display = ['user', 'action', 'model_name', 'object_repr', 'ip_address', 'created_at']
    list_filter = ['action', 'model_name', 'created_at', 'user']
    search_fields = ['user__username', 'model_name', 'object_repr', 'description', 'ip_address']
    readonly_fields = ['user', 'action', 'model_name', 'object_id', 'object_repr', 
                      'description', 'ip_address', 'user_agent', 'changes', 'created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('基本信息', {
            'fields': ('user', 'action', 'model_name', 'object_id', 'object_repr')
        }),
        ('详细信息', {
            'fields': ('description', 'ip_address', 'user_agent')
        }),
        ('变更内容', {
            'fields': ('changes',),
            'classes': ('collapse',)
        }),
        ('时间信息', {
            'fields': ('created_at',),
        }),
    )
    
    def has_add_permission(self, request) -> bool:
        """禁止手动添加审计日志"""
        return False
    
    def has_change_permission(self, request, obj=None) -> bool:
        """禁止修改审计日志"""
        return False
    
    def has_delete_permission(self, request, obj=None) -> bool:
        """允许删除审计日志（管理员）"""
        return request.user.is_superuser
