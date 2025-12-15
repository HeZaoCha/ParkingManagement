"""
通知服务

提供通知的创建和发送服务。
"""

from typing import Any, Optional

from django.contrib.auth.models import User

from apps.notifications.models import Notification, NotificationTemplate


class NotificationService:
    """通知服务类"""

    @staticmethod
    def create_notification(
        user: User,
        title: str,
        message: str,
        notification_type: str = "info",
        link: str = "",
        related_object: Optional[Any] = None,
    ) -> Notification:
        """
        创建通知

        Args:
            user: 接收用户
            title: 通知标题
            message: 通知内容
            notification_type: 通知类型
            link: 相关链接
            related_object: 关联对象

        Returns:
            Notification: 创建的通知对象
        """
        related_object_type = ""
        related_object_id = ""

        if related_object:
            related_object_type = related_object._meta.label
            related_object_id = str(related_object.pk)

        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
        )

        return notification

    @staticmethod
    def create_from_template(
        user: User,
        template_name: str,
        context: dict[str, str],
        link: str = "",
        related_object: Optional[Any] = None,
    ) -> Notification:
        """
        从模板创建通知

        Args:
            user: 接收用户
            template_name: 模板名称
            context: 模板变量
            link: 相关链接
            related_object: 关联对象

        Returns:
            Notification: 创建的通知对象
        """
        try:
            template = NotificationTemplate.objects.get(name=template_name)
            title, message = template.render(context)

            return NotificationService.create_notification(
                user=user,
                title=title,
                message=message,
                notification_type=template.notification_type,
                link=link,
                related_object=related_object,
            )
        except NotificationTemplate.DoesNotExist:
            # 如果模板不存在，使用默认格式
            return NotificationService.create_notification(
                user=user,
                title=template_name,
                message=str(context),
                link=link,
                related_object=related_object,
            )

    @staticmethod
    def get_unread_count(user: User) -> int:
        """
        获取用户未读通知数量

        Args:
            user: 用户对象

        Returns:
            int: 未读通知数量
        """
        return Notification.objects.filter(user=user, is_read=False).count()

    @staticmethod
    def mark_all_as_read(user: User) -> int:
        """
        标记用户所有通知为已读

        Args:
            user: 用户对象

        Returns:
            int: 标记的通知数量
        """
        from django.utils import timezone

        count = Notification.objects.filter(user=user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return count
