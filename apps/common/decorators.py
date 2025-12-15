"""
通用装饰器

提供项目中常用的装饰器。
"""

import functools
import time
from typing import Any, Callable, TypeVar

from django.core.cache import cache
from django.http import HttpRequest, HttpResponse
from loguru import logger

F = TypeVar("F", bound=Callable[..., Any])


def timing_decorator(func: F) -> F:
    """
    性能计时装饰器

    记录函数执行时间，用于性能分析。

    Usage:
        @timing_decorator
        def my_function():
            pass
    """

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            elapsed_time = time.time() - start_time
            logger.debug(f"函数 {func.__name__} 执行时间: {elapsed_time:.4f}秒")

    return wrapper  # type: ignore


def cache_result(timeout: int = 300, key_prefix: str = "") -> Callable[[F], F]:
    """
    缓存结果装饰器

    缓存函数执行结果，减少重复计算。

    Args:
        timeout: 缓存超时时间（秒），默认300秒
        key_prefix: 缓存键前缀

    Usage:
        @cache_result(timeout=600)
        def expensive_function(param):
            return expensive_computation(param)
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # 生成缓存键
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"
            cache_key = cache_key.replace(" ", "").replace("'", '"')

            # 尝试从缓存获取
            result = cache.get(cache_key)
            if result is not None:
                logger.debug(f"从缓存获取结果: {func.__name__}")
                return result

            # 执行函数并缓存结果
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            logger.debug(f"缓存结果: {func.__name__}")
            return result

        return wrapper  # type: ignore

    return decorator


def require_ajax(func: F) -> F:
    """
    要求AJAX请求装饰器

    确保视图函数只能通过AJAX请求访问。

    Usage:
        @require_ajax
        def my_ajax_view(request):
            pass
    """

    @functools.wraps(func)
    def wrapper(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        if not request.headers.get("X-Requested-With") == "XMLHttpRequest":
            from django.http import JsonResponse

            return JsonResponse({"error": "此接口仅支持AJAX请求"}, status=400)
        return func(request, *args, **kwargs)

    return wrapper  # type: ignore


def handle_exceptions(default_return: Any = None) -> Callable[[F], F]:
    """
    异常处理装饰器

    捕获函数执行中的异常，记录日志并返回默认值。

    Args:
        default_return: 异常时的默认返回值

    Usage:
        @handle_exceptions(default_return=[])
        def get_data():
            return some_risky_operation()
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"函数 {func.__name__} 执行出错: {str(e)}", exc_info=True)
                return default_return

        return wrapper  # type: ignore

    return decorator
