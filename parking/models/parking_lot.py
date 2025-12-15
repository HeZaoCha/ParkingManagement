"""
停车场模型

从 parking.models 迁移
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class ParkingLot(models.Model):
    """
    停车场模型

    表示一个停车场，包含停车场的基本信息、类型、结构和车位配置。
    支持多种停车场类型：露天停车场、立体停车楼、街道停车场、地下停车场。

    Author: HeZaoCha
    Created: 2024-12-09
    Last Modified: 2025-12-11
    Version: 1.1.0
    """

    LOT_TYPE_CHOICES = [
        ("outdoor", "露天停车场"),
        ("multi_story", "立体停车楼"),
        ("street", "街道停车场"),
        ("underground", "地下停车场"),
    ]

    name = models.CharField(max_length=100, verbose_name="停车场名称", help_text="停车场的名称")
    address = models.CharField(max_length=200, verbose_name="地址", help_text="停车场的详细地址")
    lot_type = models.CharField(
        max_length=20,
        choices=LOT_TYPE_CHOICES,
        default="outdoor",
        verbose_name="停车场类型",
        help_text="选择停车场类型：露天、立体停车楼、街道、地下",
    )
    # 楼层信息（JSON格式：["B2", "B3", "B4", "1F", "2F"]）
    floors = models.JSONField(
        default=list,
        blank=True,
        verbose_name="楼层列表",
        help_text='停车场的楼层信息，如["B2", "B3", "1F"]。露天停车场可为空',
    )
    # 区域信息（JSON格式：{"B2": ["A区", "B区", "C区"], "1F": ["A区", "B区"]}）
    areas = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="区域信息",
        help_text='各楼层的区域划分，格式：{"楼层": ["区域1", "区域2"]}',
    )
    total_spaces = models.PositiveIntegerField(
        default=0,
        verbose_name="总车位数",
        help_text="停车场的总车位数",
        validators=[MinValueValidator(0)],
    )
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("5.00"),
        verbose_name="每小时费率",
        help_text="停车每小时收费（元），仅在固定收费模式下使用",
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    is_active = models.BooleanField(
        default=True, verbose_name="是否启用", help_text="停车场是否正在运营"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "停车场"
        verbose_name_plural = "停车场"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_active"], name="lot_active_idx"),
            # 按类型查询优化
            models.Index(fields=["lot_type"], name="lot_type_idx"),
            # 按名称搜索优化（如果经常搜索）
            models.Index(fields=["name"], name="lot_name_idx"),
        ]

    def __str__(self) -> str:
        """返回停车场的字符串表示"""
        return self.name

    @property
    def available_spaces(self) -> int:
        """
        获取可用车位数

        Returns:
            int: 当前可用的车位数
        """
        occupied = self.parking_spaces.filter(is_occupied=True).count()
        return max(0, self.total_spaces - occupied)

    @property
    def occupied_spaces(self) -> int:
        """
        获取已占用车位数

        Returns:
            int: 当前已占用的车位数
        """
        return self.parking_spaces.filter(is_occupied=True).count()
