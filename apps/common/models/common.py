"""
通用模型基类

提供通用的模型基类，包括时间戳、软删除等功能。
"""

from __future__ import annotations

from typing import Self

from django.db import models
from django.utils import timezone


class TimestampMixin(models.Model):
    """
    时间戳混入类

    为模型添加创建时间和更新时间字段。
    """

    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name="创建时间", help_text="记录创建时间"
    )
    updated_at = models.DateTimeField(
        auto_now=True, verbose_name="更新时间", help_text="记录最后更新时间"
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class SoftDeleteMixin(models.Model):
    """
    软删除混入类

    为模型添加软删除功能，不真正删除数据，只标记为已删除。
    """

    is_deleted = models.BooleanField(
        default=False,
        verbose_name="是否已删除",
        help_text="标记记录是否已被删除（软删除）",
        db_index=True,
    )
    deleted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="删除时间", help_text="记录被删除的时间"
    )

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False) -> tuple[int, dict[str, int]]:
        """
        软删除：标记为已删除，不真正删除数据

        Args:
            using: 数据库别名
            keep_parents: 是否保留父对象

        Returns:
            tuple: 删除结果
        """
        self.is_deleted = True
        self.deleted_at = timezone.now()
        return self.save(using=using), {}

    def restore(self) -> Self:
        """
        恢复已删除的记录

        将软删除的记录恢复为正常状态。

        Returns:
            Self: 返回自身以支持链式调用（Python 3.13 Self类型注解）
        """
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at"])
        return self

    @classmethod
    def active_objects(cls) -> models.QuerySet:
        """
        获取未删除的记录

        Returns:
            QuerySet: 未删除的记录查询集
        """
        return cls.objects.filter(is_deleted=False)

    @classmethod
    def deleted_objects(cls) -> models.QuerySet:
        """
        获取已删除的记录

        Returns:
            QuerySet: 已删除的记录查询集
        """
        return cls.objects.filter(is_deleted=True)


class BaseModel(TimestampMixin, SoftDeleteMixin):
    """
    基础模型类

    包含时间戳和软删除功能的基础模型类。
    其他模型可以继承此类以获得这些功能。
    """

    class Meta:
        abstract = True
        ordering = ["-created_at"]
