"""
全局装饰器

从 apps.common.decorators 迁移
"""

# 向后兼容：重新导出所有装饰器
from .decorators import (
    timing_decorator,
    cache_result,
    require_ajax,
    handle_exceptions,
)

__all__ = [
    "timing_decorator",
    "cache_result",
    "require_ajax",
    "handle_exceptions",
]
