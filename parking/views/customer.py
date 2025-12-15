"""
客户端视图模块

提供面向停车场客户的界面，包括车辆查询、停车状态等。
无需登录即可使用基础查询功能。

Author: HeZaoCha
Created: 2024-12-10
Last Modified: 2025-12-11
Version: 1.1.0
"""

from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET
from loguru import logger


@require_GET
@cache_page(60 * 2)  # 缓存2分钟
def customer_index(request: HttpRequest) -> HttpResponse:
    """
    客户端首页

    显示停车场状态和车辆查询界面。
    """
    try:
        # 获取基础数据供模板使用
        context = {}
        return render(request, "customer/index.html", context)

    except Exception as e:
        logger.error("加载客户端首页失败: %s", str(e))
        return render(request, "customer/index.html", {})
