"""
仪表盘视图

从 parking.views 迁移
"""
from decimal import Decimal
from typing import Any

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from loguru import logger

from parking.services import DashboardService


@login_required
@cache_page(60 * 5)  # 缓存5分钟
@vary_on_headers('Cookie')  # 根据用户Cookie区分缓存
def dashboard_view(request: HttpRequest) -> HttpResponse:
    """
    仪表盘视图
    
    显示停车场管理系统的概览信息。
    使用服务层获取数据，保持视图层简洁。
    
    Args:
        request: HTTP请求对象
        
    Returns:
        HttpResponse: 仪表盘页面
    """
    try:
        # 使用服务层获取仪表盘数据
        context = DashboardService.get_dashboard_data()
        logger.debug("用户 %s 访问仪表盘", request.user.username)
        return render(request, 'dashboard.html', context)
        
    except Exception as e:
        logger.error("加载仪表盘数据时发生错误：%s", str(e), exc_info=True)
        messages.error(request, '加载数据时发生错误，请刷新页面重试')
        return render(request, 'dashboard.html', _get_empty_dashboard_context())


def _get_empty_dashboard_context() -> dict[str, Any]:
    """
    获取空的仪表盘上下文
    
    当加载数据出错时返回，避免模板渲染错误。
    
    Returns:
        dict[str, Any]: 空的上下文字典
    """
    return {
        'total_lots': 0,
        'total_spaces': 0,
        'occupied_spaces': 0,
        'available_spaces': 0,
        'today_count': 0,
        'today_revenue': Decimal('0.00'),
        'active_count': 0,
        'recent_records': [],
        'parking_lots': [],
    }
