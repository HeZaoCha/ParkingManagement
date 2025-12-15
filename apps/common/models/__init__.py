"""
通用模型

从 apps.common.models 迁移
"""

from .common import TimestampMixin, SoftDeleteMixin, BaseModel

__all__ = ["TimestampMixin", "SoftDeleteMixin", "BaseModel"]
