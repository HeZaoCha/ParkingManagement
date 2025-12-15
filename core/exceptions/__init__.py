"""
全局异常类

从 apps.common.exceptions 迁移
"""

# 向后兼容：重新导出所有异常类
from .exceptions import (
    ParkingManagementException,
    BusinessLogicError,
    ValidationError,
    NotFoundError,
    PermissionDeniedError,
)

__all__ = [
    "ParkingManagementException",
    "BusinessLogicError",
    "ValidationError",
    "NotFoundError",
    "PermissionDeniedError",
]
