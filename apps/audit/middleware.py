"""
审计日志中间件

自动记录用户操作日志。
"""
from typing import Callable

from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin
from loguru import logger

from apps.audit.services import AuditService


class AuditLogMiddleware(MiddlewareMixin):
    """
    审计日志中间件
    
    自动记录用户的登录和登出操作。
    """
    
    def process_request(self, request: HttpRequest) -> None:
        """处理请求前记录路径"""
        # 标记需要记录的操作
        if request.path.startswith('/admin/login/'):
            request._audit_action = 'login'
        elif request.path.startswith('/logout/'):
            request._audit_action = 'logout'
    
    def process_response(
        self, 
        request: HttpRequest, 
        response: HttpResponse
    ) -> HttpResponse:
        """处理响应后记录操作"""
        # 记录登录操作
        if hasattr(request, '_audit_action'):
            if request._audit_action == 'login' and response.status_code == 302:
                # 登录成功（重定向）
                try:
                    AuditService.log_action(
                        action='login',
                        model_name='User',
                        user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                        request=request,
                        description='用户登录'
                    )
                except Exception as e:
                    logger.error(f"记录登录日志失败: {e}")
            
            elif request._audit_action == 'logout':
                # 登出操作
                try:
                    AuditService.log_action(
                        action='logout',
                        model_name='User',
                        user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                        request=request,
                        description='用户登出'
                    )
                except Exception as e:
                    logger.error(f"记录登出日志失败: {e}")
        
        return response

