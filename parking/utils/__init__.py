"""
通用工具函数模块

提供项目中通用的工具函数，包括分页、异常处理等。
"""

from parking.utils.pagination import paginate_queryset

__all__ = ["paginate_queryset"]
