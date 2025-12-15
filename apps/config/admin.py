"""
系统配置管理后台
"""

from django.contrib import admin

from apps.config.models import SystemConfig


@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    """系统配置管理"""

    list_display = ["key", "group", "config_type", "value_preview", "is_public", "updated_at"]
    list_filter = ["group", "config_type", "is_public", "created_at"]
    search_fields = ["key", "description", "value"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("基本信息", {"fields": ("key", "group", "config_type", "description")}),
        ("配置值", {"fields": ("value",)}),
        ("其他", {"fields": ("is_public",)}),
        ("时间信息", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def value_preview(self, obj: SystemConfig) -> str:
        """显示配置值预览"""
        value = obj.value
        if len(value) > 50:
            return value[:50] + "..."
        return value

    value_preview.short_description = "配置值"
