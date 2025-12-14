"""
停车位模型

从 parking.models 迁移
"""
from django.db import models

from parking.models.parking_lot import ParkingLot


class ParkingSpace(models.Model):
    """
    停车位模型
    
    表示停车场中的一个具体停车位，支持楼层和区域信息。
    
    Author: HeZaoCha
    Created: 2024-12-09
    Last Modified: 2025-12-11
    Version: 1.1.0
    """
    SPACE_TYPE_CHOICES = [
        ('standard', '标准车位'),
        ('disabled', '残疾人车位'),
        ('vip', 'VIP车位'),
        ('large', '大型车位'),
    ]

    parking_lot = models.ForeignKey(
        ParkingLot,
        on_delete=models.CASCADE,
        related_name='parking_spaces',
        verbose_name='所属停车场'
    )
    floor = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='楼层',
        help_text='停车位所在楼层，如"B2"、"1F"等。露天停车场可为空'
    )
    area = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='区域',
        help_text='停车位所在区域，如"A区"、"B区"等'
    )
    space_number = models.CharField(
        max_length=20,
        verbose_name='车位编号',
        help_text='车位的唯一编号'
    )
    space_type = models.CharField(
        max_length=20,
        choices=SPACE_TYPE_CHOICES,
        default='standard',
        verbose_name='车位类型'
    )
    is_occupied = models.BooleanField(
        default=False,
        verbose_name='是否占用',
        help_text='车位当前是否被占用'
    )
    is_reserved = models.BooleanField(
        default=False,
        verbose_name='是否预留',
        help_text='车位是否被预留'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        verbose_name = '停车位'
        verbose_name_plural = '停车位'
        unique_together = [['parking_lot', 'space_number']]
        ordering = ['parking_lot', 'space_number']
        indexes = [
            models.Index(fields=['parking_lot', 'is_occupied'], name='space_lot_occupied_idx'),
            models.Index(fields=['is_occupied'], name='space_occupied_idx'),
            # 按楼层和区域查询优化
            models.Index(fields=['parking_lot', 'floor', 'area'], name='space_lot_floor_area_idx'),
            models.Index(fields=['space_type'], name='space_type_idx'),
        ]

    def __str__(self) -> str:
        """返回停车位的字符串表示"""
        return f"{self.parking_lot.name} - {self.space_number}"
