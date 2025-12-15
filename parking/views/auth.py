"""
用户认证视图

从 parking.views 迁移
"""

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods
from loguru import logger


@require_http_methods(["GET", "POST"])
def login_view(request: HttpRequest) -> HttpResponse:
    """
    用户登录视图

    处理用户登录请求，支持GET（显示登录页面）和POST（处理登录表单）。

    Args:
        request: HTTP请求对象

    Returns:
        HttpResponse: 登录页面或重定向到仪表盘
    """
    # 已登录用户重定向到仪表盘
    if request.user.is_authenticated:
        logger.info("用户 %s 已登录，重定向到仪表盘", request.user.username)
        return redirect("parking:dashboard")

    if request.method == "POST":
        return _handle_login_post(request)

    return render(request, "index.html")


def _handle_login_post(request: HttpRequest) -> HttpResponse:
    """
    处理登录POST请求

    Args:
        request: HTTP请求对象

    Returns:
        HttpResponse: 重定向或登录页面
    """
    try:
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        remember = request.POST.get("remember") == "on"

        # 验证输入
        if not username or not password:
            logger.warning("登录失败：用户名或密码为空")
            messages.error(request, "用户名和密码不能为空")
            return render(request, "index.html")

        # 认证用户
        user = authenticate(request, username=username, password=password)

        if user is None:
            # authenticate() 在用户不活跃时也会返回 None
            # 需要检查用户是否存在且不活跃
            try:
                inactive_user = User.objects.get(username=username)
                if not inactive_user.is_active:
                    logger.warning("用户 %s 账户已被禁用", username)
                    messages.error(request, "您的账户已被禁用，请联系管理员")
                    return render(request, "index.html")
            except User.DoesNotExist:
                pass

            logger.warning("用户 %s 登录失败：用户名或密码错误", username)
            messages.error(request, "用户名或密码错误，请重试")
            return render(request, "index.html")

        if not user.is_active:
            logger.warning("用户 %s 账户已被禁用", username)
            messages.error(request, "您的账户已被禁用，请联系管理员")
            return render(request, "index.html")

        # 登录成功
        login(request, user)
        _set_session_expiry(request, remember)

        logger.info("用户 %s 登录成功", username)
        messages.success(request, f"欢迎回来，{user.username}！")
        return redirect("parking:dashboard")

    except Exception as e:
        logger.error("登录过程中发生错误：%s", str(e), exc_info=True)
        messages.error(request, "登录过程中发生错误，请稍后重试")
        return render(request, "index.html")


def _set_session_expiry(request: HttpRequest, remember: bool) -> None:
    """
    设置会话过期时间

    Args:
        request: HTTP请求对象
        remember: 是否记住登录状态
    """
    if remember:
        request.session.set_expiry(2592000)  # 30天
    else:
        request.session.set_expiry(0)  # 浏览器关闭时过期


@login_required
@require_http_methods(["GET", "POST"])
def logout_view(request: HttpRequest) -> HttpResponseRedirect:
    """
    用户登出视图

    支持GET和POST请求，清除用户会话并重定向到登录页面。

    Args:
        request: HTTP请求对象

    Returns:
        HttpResponseRedirect: 重定向到登录页面
    """
    username = request.user.username
    logout(request)
    logger.info("用户 %s 已登出", username)
    messages.success(request, "您已成功登出")
    return redirect("login")


@login_required
def home_view(request: HttpRequest) -> HttpResponseRedirect:
    """
    主页视图

    重定向到仪表盘。

    Args:
        request: HTTP请求对象

    Returns:
        HttpResponseRedirect: 重定向到仪表盘
    """
    return redirect("parking:dashboard")
