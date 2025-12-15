"""
通知系统应用配置
"""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """通知系统应用配置类"""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    verbose_name = "通知系统"
