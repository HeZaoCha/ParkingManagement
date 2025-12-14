"""
日志配置

loguru配置从 apps/infrastructure/apps.py 迁移
"""

from .loguru_config import configure_loguru

__all__ = ['configure_loguru']
