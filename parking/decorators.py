"""
自定义装饰器

提供登录和权限检查装饰器，统一重定向到自定义登录页。
同时提供异常处理装饰器，统一错误处理逻辑。

Author: HeZaoCha
Created: 2025-12-11
Last Modified: 2025-12-15
Version: 1.2.0
"""

import json
from functools import wraps

from django.contrib import messages
from django.core.exceptions import ValidationError
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.conf import settings
from loguru import logger


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


def handle_api_errors(view_func):
    """
    API 视图异常处理装饰器

    统一处理 API 视图的异常，返回标准 JSON 响应格式。
    适用于所有返回 JsonResponse 的视图。

    Example:
        ```python
        @handle_api_errors
        @login_required
        @require_POST
        def api_example(request):
            # 业务逻辑
            return api_response(success=True, data={...})
        ```
    """

    @wraps(view_func)
    def _wrapped_view(request: HttpRequest, *args, **kwargs) -> JsonResponse:
        try:
            return view_func(request, *args, **kwargs)
        except json.JSONDecodeError:
            from parking.views.api import api_response

            return api_response(
                success=False, message="请求数据格式错误", error_code="invalid_json"
            )
        except ValidationError as e:
            from parking.views.api import api_response

            return api_response(
                success=False,
                message=str(e.message) if hasattr(e, "message") else str(e),
                error_code="validation_error",
            )
        except Exception as e:
            logger.exception(f"{view_func.__name__} 异常: {str(e)}")
            from parking.views.api import api_response

            return api_response(
                success=False, message="系统错误，请稍后重试", error_code="server_error"
            )

    return _wrapped_view


def handle_view_errors(view_func):
    """
    普通视图异常处理装饰器

    统一处理普通视图的异常，显示错误消息并返回错误页面。
    适用于返回 HttpResponse 的视图。

    Example:
        ```python
        @handle_view_errors
        @staff_member_required
        def example_view(request):
            # 业务逻辑
            return render(request, "template.html", context)
        ```
    """

    @wraps(view_func)
    def _wrapped_view(request: HttpRequest, *args, **kwargs) -> HttpResponse:
        try:
            return view_func(request, *args, **kwargs)
        except Exception as e:
            logger.exception(f"{view_func.__name__} 异常: {str(e)}")
            messages.error(request, "操作失败，请稍后重试")
            # 尝试返回错误页面，如果不存在则返回 500 响应
            try:
                return render(request, "500.html", status=500)
            except Exception:
                from django.http import HttpResponseServerError

                return HttpResponseServerError("服务器内部错误")

    return _wrapped_view
