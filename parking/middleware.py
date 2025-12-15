"""
停车场应用中间件

提供Session过期检查、权限验证等功能。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.1.0
"""

from django.contrib.auth import logout
from django.contrib.sessions.models import Session
from django.http import JsonResponse
from django.utils import timezone
from loguru import logger


class SessionExpiryMiddleware:
    """
    Session过期中间件

    检查用户Session是否过期，过期则自动登出。
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 检查Session是否过期
        if request.user.is_authenticated:
            session_key = request.session.session_key
            if session_key:
                try:
                    session = Session.objects.get(session_key=session_key)
                    # 检查Session是否过期
                    if session.expire_date and session.expire_date < timezone.now():
                        # Session已过期，登出用户
                        logout(request)
                        logger.info(f"Session过期，用户已登出: {request.user.username}")

                        # 如果是AJAX请求，返回JSON响应
                        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                            return JsonResponse(
                                {
                                    "success": False,
                                    "message": "登录已过期，请重新登录",
                                    "error_code": "session_expired",
                                    "redirect_url": "/login/",
                                },
                                status=401,
                            )
                except Session.DoesNotExist:
                    # Session不存在，登出用户
                    logout(request)

        response = self.get_response(request)
        return response


class PermissionCheckMiddleware:
    """
    权限检查中间件

    根据用户角色重定向到对应界面。
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # 如果用户已登录，检查是否需要重定向
        if request.user.is_authenticated:
            # 获取用户角色
            try:
                profile = request.user.profile
                role = profile.role
            except AttributeError:
                # 如果没有profile，默认为客户
                role = "customer"

            # 根据路径和角色进行重定向
            path = request.path

            # 客户访问管理员/工作人员页面，重定向到客户页面
            if role == "customer" and path.startswith(("/dashboard/", "/manage/")):
                from django.shortcuts import redirect

                return redirect("/parking/customer/")

            # 工作人员访问管理员页面，重定向到工作台
            if role == "staff" and path.startswith("/manage/"):
                from django.shortcuts import redirect

                return redirect("/dashboard/")

        return response
