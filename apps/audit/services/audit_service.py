"""
审计日志服务

提供审计日志的创建和查询服务。
"""
import json
from typing import Any, Optional

from django.contrib.auth.models import User
from django.db import transaction
from django.http import HttpRequest

from apps.audit.models import AuditLog


class AuditService:
    """审计日志服务类"""
    
    @staticmethod
    @transaction.atomic
    def log_action(
        action: str,
        model_name: str,
        user: Optional[User] = None,
        object_id: Optional[str] = None,
        object_repr: Optional[str] = None,
        description: str = '',
        request: Optional[HttpRequest] = None,
        changes: Optional[dict[str, Any]] = None
    ) -> AuditLog:
        """
        记录操作日志
        
        Args:
            action: 操作类型（create/update/delete/view等）
            model_name: 模型名称
            user: 操作用户
            object_id: 对象ID
            object_repr: 对象表示
            description: 操作描述
            request: HTTP请求对象（用于获取IP和User-Agent）
            changes: 变更内容（字典格式）
            
        Returns:
            AuditLog: 创建的审计日志对象
        """
        ip_address = None
        user_agent = ''
        
        if request:
            # 获取IP地址
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            # 获取User-Agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        # 如果没有提供user，尝试从request获取
        if not user and request and hasattr(request, 'user'):
            user = request.user if request.user.is_authenticated else None
        
        audit_log = AuditLog.objects.create(
            user=user,
            action=action,
            model_name=model_name,
            object_id=str(object_id) if object_id else None,
            object_repr=object_repr[:200] if object_repr else None,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            changes=changes
        )
        
        return audit_log
    
    @staticmethod
    def log_model_create(
        instance: Any,
        user: Optional[User] = None,
        request: Optional[HttpRequest] = None,
        description: str = ''
    ) -> AuditLog:
        """
        记录模型创建操作
        
        Args:
            instance: 创建的模型实例
            user: 操作用户
            request: HTTP请求对象
            description: 操作描述
            
        Returns:
            AuditLog: 创建的审计日志对象
        """
        model_name = instance._meta.label
        return AuditService.log_action(
            action='create',
            model_name=model_name,
            user=user,
            object_id=str(instance.pk),
            object_repr=str(instance),
            description=description or f"创建{model_name}对象",
            request=request
        )
    
    @staticmethod
    def log_model_update(
        instance: Any,
        user: Optional[User] = None,
        request: Optional[HttpRequest] = None,
        old_values: Optional[dict[str, Any]] = None,
        new_values: Optional[dict[str, Any]] = None,
        description: str = ''
    ) -> AuditLog:
        """
        记录模型更新操作
        
        Args:
            instance: 更新的模型实例
            user: 操作用户
            request: HTTP请求对象
            old_values: 更新前的值
            new_values: 更新后的值
            description: 操作描述
            
        Returns:
            AuditLog: 创建的审计日志对象
        """
        model_name = instance._meta.label
        
        changes = None
        if old_values and new_values:
            changes = {
                'old': old_values,
                'new': new_values
            }
        
        return AuditService.log_action(
            action='update',
            model_name=model_name,
            user=user,
            object_id=str(instance.pk),
            object_repr=str(instance),
            description=description or f"更新{model_name}对象",
            request=request,
            changes=changes
        )
    
    @staticmethod
    def log_model_delete(
        instance: Any,
        user: Optional[User] = None,
        request: Optional[HttpRequest] = None,
        description: str = ''
    ) -> AuditLog:
        """
        记录模型删除操作
        
        Args:
            instance: 删除的模型实例
            user: 操作用户
            request: HTTP请求对象
            description: 操作描述
            
        Returns:
            AuditLog: 创建的审计日志对象
        """
        model_name = instance._meta.label
        return AuditService.log_action(
            action='delete',
            model_name=model_name,
            user=user,
            object_id=str(instance.pk),
            object_repr=str(instance),
            description=description or f"删除{model_name}对象",
            request=request
        )

