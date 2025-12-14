"""
审计日志模型

记录系统操作日志，满足审计要求。
"""
from typing import Optional

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

from apps.common.models import TimestampMixin


class AuditLog(TimestampMixin, models.Model):
    """
    审计日志模型
    
    记录系统中的所有重要操作，包括增删改查等。
    """
    ACTION_CHOICES = [
        ('create', '创建'),
        ('update', '更新'),
        ('delete', '删除'),
        ('view', '查看'),
        ('login', '登录'),
        ('logout', '登出'),
        ('export', '导出'),
        ('import', '导入'),
        ('other', '其他'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='操作用户',
        help_text='执行操作的用户'
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name='操作类型',
        help_text='操作的类型'
    )
    model_name = models.CharField(
        max_length=100,
        verbose_name='模型名称',
        help_text='被操作的模型名称'
    )
    object_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='对象ID',
        help_text='被操作对象的ID'
    )
    object_repr = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        verbose_name='对象表示',
        help_text='被操作对象的字符串表示'
    )
    description = models.TextField(
        blank=True,
        verbose_name='操作描述',
        help_text='操作的详细描述'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP地址',
        help_text='操作来源的IP地址'
    )
    user_agent = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='用户代理',
        help_text='浏览器或客户端信息'
    )
    changes = models.JSONField(
        null=True,
        blank=True,
        verbose_name='变更内容',
        help_text='记录变更前后的数据（JSON格式）'
    )

    class Meta:
        verbose_name = '审计日志'
        verbose_name_plural = '审计日志'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at'], name='audit_created_idx'),
            models.Index(fields=['user', '-created_at'], name='audit_user_created_idx'),
            models.Index(fields=['action', '-created_at'], name='audit_action_created_idx'),
            models.Index(fields=['model_name', '-created_at'], name='audit_model_created_idx'),
        ]

    def __str__(self) -> str:
        """返回审计日志的字符串表示"""
        user_name = self.user.username if self.user else '匿名'
        return f"{user_name} - {self.get_action_display()} - {self.model_name}"
