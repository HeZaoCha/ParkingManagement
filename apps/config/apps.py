"""
系统配置应用配置
"""

from django.apps import AppConfig


class ConfigConfig(AppConfig):
    """系统配置应用配置类"""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.config"
    verbose_name = "系统配置"
