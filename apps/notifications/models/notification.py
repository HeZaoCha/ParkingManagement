"""
通知系统模型

管理系统消息通知。
"""

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

from apps.common.models import TimestampMixin


class Notification(TimestampMixin, models.Model):
    """
    通知模型

    存储系统消息通知。
    """

    NOTIFICATION_TYPE_CHOICES = [
        ("info", "信息"),
        ("success", "成功"),
        ("warning", "警告"),
        ("error", "错误"),
        ("system", "系统"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="接收用户",
        help_text="接收通知的用户",
    )
    title = models.CharField(max_length=200, verbose_name="通知标题", help_text="通知的标题")
    message = models.TextField(verbose_name="通知内容", help_text="通知的详细内容")
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPE_CHOICES,
        default="info",
        verbose_name="通知类型",
        help_text="通知的类型",
    )
    is_read = models.BooleanField(
        default=False, db_index=True, verbose_name="是否已读", help_text="用户是否已阅读此通知"
    )
    read_at = models.DateTimeField(
        null=True, blank=True, verbose_name="阅读时间", help_text="用户阅读通知的时间"
    )
    link = models.URLField(blank=True, verbose_name="相关链接", help_text="通知相关的链接地址")
    related_object_type = models.CharField(
        max_length=100, blank=True, verbose_name="关联对象类型", help_text="关联的模型类型"
    )
    related_object_id = models.CharField(
        max_length=100, blank=True, verbose_name="关联对象ID", help_text="关联的对象ID"
    )

    class Meta:
        verbose_name = "通知"
        verbose_name_plural = "通知"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "-created_at"], name="notif_user_read_idx"),
            models.Index(fields=["-created_at"], name="notif_created_idx"),
        ]

    def __str__(self) -> str:
        """返回通知的字符串表示"""
        return f"{self.user.username} - {self.title}"

    def mark_as_read(self) -> None:
        """标记通知为已读"""
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=["is_read", "read_at"])


class NotificationTemplate(TimestampMixin, models.Model):
    """
    通知模板模型

    存储通知消息模板。
    """

    name = models.CharField(
        max_length=100, unique=True, verbose_name="模板名称", help_text="模板的唯一名称"
    )
    title_template = models.CharField(
        max_length=200, verbose_name="标题模板", help_text="通知标题模板（支持变量替换）"
    )
    message_template = models.TextField(
        verbose_name="内容模板", help_text="通知内容模板（支持变量替换）"
    )
    notification_type = models.CharField(
        max_length=20,
        choices=Notification.NOTIFICATION_TYPE_CHOICES,
        default="info",
        verbose_name="通知类型",
        help_text="使用此模板的通知类型",
    )
    description = models.CharField(
        max_length=200, blank=True, verbose_name="模板描述", help_text="模板的说明"
    )

    class Meta:
        verbose_name = "通知模板"
        verbose_name_plural = "通知模板"
        ordering = ["name"]

    def __str__(self) -> str:
        """返回模板的字符串表示"""
        return self.name

    def render(self, context: dict[str, str]) -> tuple[str, str]:
        """
        渲染模板

        Args:
            context: 模板变量字典

        Returns:
            tuple: (标题, 内容)
        """
        title = self.title_template
        message = self.message_template

        # 简单的变量替换
        for key, value in context.items():
            title = title.replace(f"{{{key}}}", str(value))
            message = message.replace(f"{{{key}}}", str(value))

        return title, message
