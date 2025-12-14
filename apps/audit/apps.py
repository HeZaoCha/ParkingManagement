"""
审计日志应用配置
"""
from django.apps import AppConfig


class AuditConfig(AppConfig):
    """审计日志应用配置类"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.audit'
    verbose_name = '审计日志'
