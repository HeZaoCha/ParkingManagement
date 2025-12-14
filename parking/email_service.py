"""
邮件服务

提供邮件发送功能，包括验证码、激活码等。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.1.0
"""
from typing import TYPE_CHECKING

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.template import TemplateDoesNotExist
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from loguru import logger

if TYPE_CHECKING:
    from parking.user_models import ContactMessage


class EmailService:
    """邮件服务类"""
    
    @staticmethod
    def _validate_email(email: str) -> bool:
        """
        验证邮箱格式
        
        Args:
            email: 邮箱地址
            
        Returns:
            是否有效
            
        Raises:
            ValueError: 邮箱格式无效
        """
        if not email:
            raise ValueError('邮箱地址不能为空')
        
        if not isinstance(email, str):
            raise ValueError('邮箱地址必须是字符串')
        
        email = email.strip()
        if not email:
            raise ValueError('邮箱地址不能为空')
        
        try:
            validate_email(email)
            return True
        except ValidationError:
            raise ValueError(f'邮箱格式无效: {email}')
    
    @staticmethod
    def _check_email_config() -> None:
        """
        检查邮件配置是否完整
        
        Raises:
            ValueError: 配置不完整
        """
        if not hasattr(settings, 'DEFAULT_FROM_EMAIL') or not settings.DEFAULT_FROM_EMAIL:
            raise ValueError('邮件配置不完整: DEFAULT_FROM_EMAIL 未设置')
        
        if not hasattr(settings, 'EMAIL_HOST_USER') or not settings.EMAIL_HOST_USER:
            raise ValueError('邮件配置不完整: EMAIL_HOST_USER 未设置')
    
    @staticmethod
    def send_verification_code(
        email: str,
        code: str,
        purpose: str = '注册'
    ) -> bool:
        """
        发送验证码邮件
        
        Args:
            email: 收件人邮箱
            code: 验证码
            purpose: 用途（注册/登录/重置密码）
            
        Returns:
            是否发送成功
        """
        # 验证输入
        try:
            EmailService._validate_email(email)
            EmailService._check_email_config()
        except ValueError as e:
            logger.error(f'验证码邮件发送失败: 输入验证错误 - {e}')
            return False
        
        if not code:
            logger.error('验证码邮件发送失败: 验证码不能为空')
            return False
        
        subject = f'【早点喝茶停车场】{purpose}验证码'
        
        context = {
            'code': code,
            'purpose': purpose,
            'expire_minutes': settings.VERIFICATION_CODE_EXPIRE_MINUTES,
        }
        
        # 渲染模板
        try:
            html_message = render_to_string('emails/verification_code.html', context)
        except TemplateDoesNotExist as e:
            logger.error(f'验证码邮件发送失败: 模板文件不存在 - {e}')
            return False
        except Exception as e:
            logger.error(f'验证码邮件发送失败: 模板渲染错误 - {e}')
            return False
        
        plain_message = strip_tags(html_message)
        
        # 发送邮件
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email.strip()],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f'验证码邮件发送成功: {email}')
            return True
        except Exception as e:
            logger.error(f'验证码邮件发送失败: {email}, 错误: {e}')
            return False
    
    @staticmethod
    def send_activation_link(
        email: str,
        activation_code: str,
        activation_url: str
    ) -> bool:
        """
        发送激活链接邮件
        
        Args:
            email: 收件人邮箱
            activation_code: 激活码
            activation_url: 激活链接
            
        Returns:
            是否发送成功
        """
        # 验证输入
        try:
            EmailService._validate_email(email)
            EmailService._check_email_config()
        except ValueError as e:
            logger.error(f'激活邮件发送失败: 输入验证错误 - {e}')
            return False
        
        if not activation_code:
            logger.error('激活邮件发送失败: 激活码不能为空')
            return False
        
        if not activation_url:
            logger.error('激活邮件发送失败: 激活链接不能为空')
            return False
        
        subject = '【早点喝茶停车场】账户激活'
        
        context = {
            'activation_code': activation_code,
            'activation_url': activation_url,
        }
        
        # 渲染模板
        try:
            html_message = render_to_string('emails/activation.html', context)
        except TemplateDoesNotExist as e:
            logger.error(f'激活邮件发送失败: 模板文件不存在 - {e}')
            return False
        except Exception as e:
            logger.error(f'激活邮件发送失败: 模板渲染错误 - {e}')
            return False
        
        plain_message = strip_tags(html_message)
        
        # 发送邮件
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email.strip()],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f'激活邮件发送成功: {email}')
            return True
        except Exception as e:
            logger.error(f'激活邮件发送失败: {email}, 错误: {e}')
            return False
    
    @staticmethod
    def send_contact_notification(
        admin_email: str,
        contact_message: 'ContactMessage'  # type: ignore
    ) -> bool:
        """
        发送联系消息通知给管理员
        
        Args:
            admin_email: 管理员邮箱
            contact_message: 联系消息对象
            
        Returns:
            是否发送成功
        """
        # 验证输入
        try:
            EmailService._validate_email(admin_email)
            EmailService._check_email_config()
        except ValueError as e:
            logger.error(f'联系消息通知发送失败: 输入验证错误 - {e}')
            return False
        
        if not contact_message:
            logger.error('联系消息通知发送失败: 联系消息对象不能为空')
            return False
        
        subject = f'【早点喝茶停车场】新消息：{contact_message.subject or "无标题"}'
        
        context = {
            'message': contact_message,
        }
        
        # 渲染模板
        try:
            html_message = render_to_string('emails/contact_notification.html', context)
        except TemplateDoesNotExist as e:
            logger.error(f'联系消息通知发送失败: 模板文件不存在 - {e}')
            return False
        except Exception as e:
            logger.error(f'联系消息通知发送失败: 模板渲染错误 - {e}')
            return False
        
        plain_message = strip_tags(html_message)
        
        # 发送邮件
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[admin_email.strip()],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f'联系消息通知发送成功: {admin_email}')
            return True
        except Exception as e:
            logger.error(f'联系消息通知发送失败: {admin_email}, 错误: {e}')
            return False
    
    @staticmethod
    def send_contact_reply(
        email: str,
        contact_message: 'ContactMessage',  # type: ignore
        reply_content: str
    ) -> bool:
        """
        发送联系消息回复
        
        Args:
            email: 用户邮箱
            contact_message: 联系消息对象
            reply_content: 回复内容
            
        Returns:
            是否发送成功
        """
        # 验证输入
        try:
            EmailService._validate_email(email)
            EmailService._check_email_config()
        except ValueError as e:
            logger.error(f'联系消息回复发送失败: 输入验证错误 - {e}')
            return False
        
        if not contact_message:
            logger.error('联系消息回复发送失败: 联系消息对象不能为空')
            return False
        
        if not reply_content or not reply_content.strip():
            logger.error('联系消息回复发送失败: 回复内容不能为空')
            return False
        
        subject = f'【早点喝茶停车场】关于您的反馈：{contact_message.subject or "无标题"}'
        
        context = {
            'message': contact_message,
            'reply': reply_content,
        }
        
        # 渲染模板
        try:
            html_message = render_to_string('emails/contact_reply.html', context)
        except TemplateDoesNotExist as e:
            logger.error(f'联系消息回复发送失败: 模板文件不存在 - {e}')
            return False
        except Exception as e:
            logger.error(f'联系消息回复发送失败: 模板渲染错误 - {e}')
            return False
        
        plain_message = strip_tags(html_message)
        
        # 发送邮件
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email.strip()],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f'联系消息回复发送成功: {email}')
            return True
        except Exception as e:
            logger.error(f'联系消息回复发送失败: {email}, 错误: {e}')
            return False

