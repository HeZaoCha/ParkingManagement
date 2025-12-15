"""
Loguru日志配置

从 apps.infrastructure.apps.py 迁移
"""

from pathlib import Path

from django.conf import settings
from loguru import logger


def configure_loguru():
    """
    配置 loguru 日志系统

    在应用启动时调用此函数来配置日志系统。
    """
    # 移除默认的 handler
    logger.remove()

    # 日志格式
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    # 控制台输出（开发环境）
    logger.add(
        lambda msg: print(msg, end=""),
        format=log_format,
        level="DEBUG" if settings.DEBUG else "INFO",
        colorize=True,
    )

    # 文件输出
    log_file = Path(settings.BASE_DIR) / "logs" / "parking_management.log"
    logger.add(
        str(log_file),
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} | {message}",
        level="DEBUG",
        rotation="10 MB",
        retention="7 days",
        compression="zip",
        encoding="utf-8",
    )

    # 错误日志单独文件
    error_log_file = Path(settings.BASE_DIR) / "logs" / "errors.log"
    logger.add(
        str(error_log_file),
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} | {message}",
        level="ERROR",
        rotation="10 MB",
        retention="30 days",
        compression="zip",
        encoding="utf-8",
    )
