"""
邮件发送异步任务
"""

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings


@shared_task(bind=True, max_retries=3)
def send_email_async(self, subject, message, recipient_list, from_email=None):
    """
    异步发送邮件

    Args:
        subject: 邮件主题
        message: 邮件内容
        recipient_list: 收件人列表
        from_email: 发件人（可选）
    """
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email or settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        return {"status": "success", "recipients": recipient_list}
    except Exception as exc:
        # 重试
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_verification_code_async(self, email, code, code_type="email"):
    """
    异步发送验证码

    Args:
        email: 邮箱地址
        code: 验证码
        code_type: 验证码类型
    """
    try:
        from parking.email_service import EmailService

        EmailService.send_verification_code(email, code, code_type)
        return {"status": "success", "email": email}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
