"""
全局中间件

提供系统级的中间件功能。

从 apps.infrastructure.middleware 迁移
"""

import time
from typing import Callable

from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin
from loguru import logger


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    请求日志中间件
    
    记录所有HTTP请求的详细信息，用于调试和监控。
    """
    
    def process_request(self, request: HttpRequest) -> None:
        """处理请求前记录开始时间"""
        request._start_time = time.time()
    
    def process_response(
        self, 
        request: HttpRequest, 
        response: HttpResponse
    ) -> HttpResponse:
        """处理响应后记录请求信息"""
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
            logger.info(
                f"{request.method} {request.path} - "
                f"状态码: {response.status_code} - "
                f"耗时: {duration:.4f}秒 - "
                f"IP: {self.get_client_ip(request)}"
            )
        return response
    
    @staticmethod
    def get_client_ip(request: HttpRequest) -> str:
        """
        获取客户端IP地址
        
        Args:
            request: HTTP请求对象
            
        Returns:
            str: 客户端IP地址
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
        return ip


class PerformanceMonitoringMiddleware(MiddlewareMixin):
    """
    性能监控中间件
    
    监控慢请求，记录超过阈值的请求。
    """
    SLOW_REQUEST_THRESHOLD = 1.0  # 慢请求阈值（秒）
    
    def process_request(self, request: HttpRequest) -> None:
        """处理请求前记录开始时间"""
        request._perf_start_time = time.time()
    
    def process_response(
        self, 
        request: HttpRequest, 
        response: HttpResponse
    ) -> HttpResponse:
        """处理响应后检查性能"""
        if hasattr(request, '_perf_start_time'):
            duration = time.time() - request._perf_start_time
            if duration > self.SLOW_REQUEST_THRESHOLD:
                logger.warning(
                    f"慢请求检测: {request.method} {request.path} - "
                    f"耗时: {duration:.4f}秒（阈值: {self.SLOW_REQUEST_THRESHOLD}秒）"
                )
        return response
