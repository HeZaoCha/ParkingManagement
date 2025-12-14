"""
信号处理器

处理Django信号，实现模块间解耦通信。
"""
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from loguru import logger


@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    """
    记录模型保存操作
    
    当任何模型被保存时，记录日志（排除某些系统模型）。
    """
    # 排除Django内置模型
    excluded_apps = ['admin', 'contenttypes', 'sessions', 'auth']
    app_label = sender._meta.app_label
    
    if app_label not in excluded_apps:
        action = "创建" if created else "更新"
        logger.debug(
            f"模型保存: {sender.__name__} - {action} - "
            f"ID: {getattr(instance, 'id', 'N/A')}"
        )


@receiver(pre_delete)
def log_model_delete(sender, instance, **kwargs):
    """
    记录模型删除操作
    
    当任何模型被删除时，记录日志（排除某些系统模型）。
    """
    # 排除Django内置模型
    excluded_apps = ['admin', 'contenttypes', 'sessions', 'auth']
    app_label = sender._meta.app_label
    
    if app_label not in excluded_apps:
        logger.debug(
            f"模型删除: {sender.__name__} - "
            f"ID: {getattr(instance, 'id', 'N/A')}"
        )

