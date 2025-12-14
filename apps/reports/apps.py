"""
报表统计应用配置
"""
from django.apps import AppConfig


class ReportsConfig(AppConfig):
    """报表统计应用配置类"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.reports'
    verbose_name = '报表统计'
