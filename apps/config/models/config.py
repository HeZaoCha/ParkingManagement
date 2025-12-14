"""
系统配置模型

管理系统配置参数。
"""
from typing import Any, Optional

from django.core.cache import cache
from django.db import models

from apps.common.models import TimestampMixin


class SystemConfig(TimestampMixin, models.Model):
    """
    系统配置模型
    
    存储系统的配置参数，支持分组和缓存。
    """
    CONFIG_TYPE_CHOICES = [
        ('string', '字符串'),
        ('integer', '整数'),
        ('float', '浮点数'),
        ('boolean', '布尔值'),
        ('json', 'JSON'),
    ]
    
    key = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name='配置键',
        help_text='配置的唯一标识符'
    )
    value = models.TextField(
        verbose_name='配置值',
        help_text='配置的值（存储为文本）'
    )
    config_type = models.CharField(
        max_length=20,
        choices=CONFIG_TYPE_CHOICES,
        default='string',
        verbose_name='配置类型',
        help_text='配置值的数据类型'
    )
    group = models.CharField(
        max_length=50,
        default='general',
        db_index=True,
        verbose_name='配置分组',
        help_text='配置的分组名称'
    )
    description = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='配置描述',
        help_text='配置的说明'
    )
    is_public = models.BooleanField(
        default=False,
        verbose_name='是否公开',
        help_text='是否允许前端访问此配置'
    )

    class Meta:
        verbose_name = '系统配置'
        verbose_name_plural = '系统配置'
        ordering = ['group', 'key']
        indexes = [
            models.Index(fields=['group', 'key'], name='config_group_key_idx'),
        ]

    def __str__(self) -> str:
        """返回配置的字符串表示"""
        return f"{self.group}.{self.key}"

    def get_value(self) -> Any:
        """
        获取配置值（根据类型转换）
        
        Returns:
            Any: 转换后的配置值
        """
        if self.config_type == 'integer':
            return int(self.value)
        elif self.config_type == 'float':
            return float(self.value)
        elif self.config_type == 'boolean':
            return self.value.lower() in ('true', '1', 'yes', 'on')
        elif self.config_type == 'json':
            import json
            return json.loads(self.value)
        else:
            return self.value

    def set_value(self, value: Any) -> None:
        """
        设置配置值（自动转换为字符串）
        
        Args:
            value: 配置值
        """
        if self.config_type == 'json':
            import json
            self.value = json.dumps(value, ensure_ascii=False)
        else:
            self.value = str(value)

    def save(self, *args, **kwargs) -> None:
        """
        保存配置时清除缓存
        
        Args:
            *args: 位置参数
            **kwargs: 关键字参数
        """
        super().save(*args, **kwargs)
        # 清除缓存
        cache_key = f"config:{self.key}"
        cache.delete(cache_key)
        cache.delete("config:all")
