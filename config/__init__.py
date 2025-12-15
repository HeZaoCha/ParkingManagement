"""
Django项目配置包

包含Celery初始化
"""

from .celery import app as celery_app

__all__ = ("celery_app",)
