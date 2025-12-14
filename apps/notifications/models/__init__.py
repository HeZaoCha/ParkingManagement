"""
通知模型

从 apps.notifications.models 迁移
"""

from .notification import Notification, NotificationTemplate

__all__ = ['Notification', 'NotificationTemplate']
