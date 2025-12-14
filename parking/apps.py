"""
停车场管理应用配置
"""
from django.apps import AppConfig


class ParkingConfig(AppConfig):
    """停车场管理应用配置类"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'parking'
    verbose_name = '停车场管理'
