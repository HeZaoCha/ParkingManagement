"""
自定义装饰器

提供登录和权限检查装饰器，统一重定向到自定义登录页。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.1.0
"""

from functools import wraps

from django.shortcuts import redirect
from django.conf import settings


def staff_member_required(view_func):
    """
    工作人员权限装饰器

    要求用户必须是staff，未登录或非staff用户重定向到/login/而不是/admin/login/。
    """

    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            # 未登录，重定向到自定义登录页
            from django.contrib.auth.views import redirect_to_login

            return redirect_to_login(request.get_full_path(), login_url=settings.LOGIN_URL)

        if not request.user.is_staff:
            # 非staff用户，重定向到登录页
            from django.contrib import messages

            messages.error(request, "您没有权限访问此页面")
            return redirect(settings.LOGIN_URL)

        return view_func(request, *args, **kwargs)

    return _wrapped_view


def login_required_redirect(view_func):
    """
    登录要求装饰器

    确保用户已登录，未登录重定向到/login/。
    """

    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            from django.contrib.auth.views import redirect_to_login

            return redirect_to_login(request.get_full_path(), login_url=settings.LOGIN_URL)
        return view_func(request, *args, **kwargs)

    return _wrapped_view
