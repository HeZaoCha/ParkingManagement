"""
用户扩展模型

包含用户资料、验证码、排班等扩展功能。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.1.0
"""
from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Optional

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class UserProfile(models.Model):
    """用户资料扩展"""
    
    ROLE_CHOICES = [
        ('admin', '管理员'),
        ('staff', '工作人员'),
        ('customer', '客户'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='用户'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='customer',
        verbose_name='角色'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='手机号'
    )
    email_verified = models.BooleanField(
        default=False,
        verbose_name='邮箱已验证'
    )
    phone_verified = models.BooleanField(
        default=False,
        verbose_name='手机已验证'
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
        verbose_name = '用户资料'
        verbose_name_plural = '用户资料'
        db_table = 'parking_user_profile'
    
    def __str__(self) -> str:
        return f'{self.user.username} ({self.get_role_display()})'


class VerificationCode(models.Model):
    """验证码模型（邮件/手机）"""
    
    TYPE_CHOICES = [
        ('email', '邮箱验证码'),
        ('phone', '手机验证码'),
        ('email_activation', '邮箱激活码'),
    ]
    
    PURPOSE_CHOICES = [
        ('register', '注册'),
        ('login', '登录'),
        ('reset_password', '重置密码'),
        ('activate', '激活账户'),
    ]
    
    code_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        verbose_name='验证码类型'
    )
    purpose = models.CharField(
        max_length=20,
        choices=PURPOSE_CHOICES,
        verbose_name='用途'
    )
    target = models.CharField(
        max_length=255,
        verbose_name='目标（邮箱/手机号）'
    )
    code = models.CharField(
        max_length=10,
        verbose_name='验证码'
    )
    expires_at = models.DateTimeField(
        verbose_name='过期时间'
    )
    is_used = models.BooleanField(
        default=False,
        verbose_name='已使用'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '验证码'
        verbose_name_plural = '验证码'
        db_table = 'parking_verification_code'
        indexes = [
            models.Index(fields=['target', 'code_type', 'purpose']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self) -> str:
        return f'{self.get_code_type_display()} - {self.target}'
    
    @classmethod
    def generate_code(cls, length: int = 6) -> str:
        """生成数字验证码"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(length)])
    
    @classmethod
    def create_code(
        cls,
        code_type: str,
        purpose: str,
        target: str,
        expires_minutes: int = 10
    ) -> VerificationCode:
        """创建验证码"""
        # 使旧验证码失效
        cls.objects.filter(
            target=target,
            code_type=code_type,
            purpose=purpose,
            is_used=False,
            expires_at__gt=timezone.now()
        ).update(is_used=True)
        
        code = cls.generate_code()
        expires_at = timezone.now() + timedelta(minutes=expires_minutes)
        
        return cls.objects.create(
            code_type=code_type,
            purpose=purpose,
            target=target,
            code=code,
            expires_at=expires_at
        )
    
    def is_valid(self) -> bool:
        """检查验证码是否有效"""
        if self.is_used:
            return False
        if timezone.now() > self.expires_at:
            return False
        return True
    
    def verify(self) -> bool:
        """验证并标记为已使用"""
        if not self.is_valid():
            return False
        self.is_used = True
        self.save(update_fields=['is_used'])
        return True


class StaffSchedule(models.Model):
    """工作人员排班表"""
    
    WEEKDAY_CHOICES = [
        (0, '周一'),
        (1, '周二'),
        (2, '周三'),
        (3, '周四'),
        (4, '周五'),
        (5, '周六'),
        (6, '周日'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='schedules',
        verbose_name='工作人员'
    )
    parking_lot = models.ForeignKey(
        'parking.ParkingLot',
        on_delete=models.CASCADE,
        related_name='staff_schedules',
        verbose_name='停车场'
    )
    weekday = models.IntegerField(
        choices=WEEKDAY_CHOICES,
        verbose_name='星期'
    )
    start_time = models.TimeField(
        verbose_name='开始时间'
    )
    end_time = models.TimeField(
        verbose_name='结束时间'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用'
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
        verbose_name = '排班表'
        verbose_name_plural = '排班表'
        db_table = 'parking_staff_schedule'
        unique_together = [['user', 'parking_lot', 'weekday']]
        indexes = [
            models.Index(fields=['parking_lot', 'weekday', 'is_active']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self) -> str:
        return f'{self.user.username} - {self.get_weekday_display()} {self.start_time}-{self.end_time}'
    
    def clean(self) -> None:
        """验证时间范围"""
        if self.start_time >= self.end_time:
            raise ValidationError('结束时间必须晚于开始时间')
    
    def save(self, *args, **kwargs) -> None:
        self.full_clean()
        super().save(*args, **kwargs)


class ContactMessage(models.Model):
    """联系消息（用户反馈）"""
    
    TYPE_CHOICES = [
        ('feedback', '意见反馈'),
        ('bug', '问题报告'),
        ('suggestion', '功能建议'),
        ('other', '其他'),
    ]
    
    STATUS_CHOICES = [
        ('pending', '待处理'),
        ('processing', '处理中'),
        ('resolved', '已解决'),
        ('closed', '已关闭'),
    ]
    
    name = models.CharField(
        max_length=100,
        verbose_name='姓名'
    )
    email = models.EmailField(
        verbose_name='邮箱'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='手机号'
    )
    message_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='feedback',
        verbose_name='消息类型'
    )
    subject = models.CharField(
        max_length=200,
        verbose_name='主题'
    )
    content = models.TextField(
        verbose_name='内容'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='状态'
    )
    reply = models.TextField(
        blank=True,
        null=True,
        verbose_name='回复'
    )
    replied_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='replied_messages',
        verbose_name='回复人'
    )
    replied_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='回复时间'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '联系消息'
        verbose_name_plural = '联系消息'
        db_table = 'parking_contact_message'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'message_type']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self) -> str:
        return f'{self.name} - {self.subject}'

