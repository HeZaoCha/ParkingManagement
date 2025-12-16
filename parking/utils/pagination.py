"""
分页工具函数

提供通用的分页功能，减少视图层重复代码。
"""

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import QuerySet
from django.http import HttpRequest


def paginate_queryset(
    queryset: QuerySet, request: HttpRequest, page_size: int = 15, page_param: str = "page"
) -> tuple:
    """
    通用分页函数

    对查询集进行分页处理，返回分页对象和当前页码。

    Args:
        queryset: Django 查询集
        request: HTTP 请求对象
        page_size: 每页显示数量，默认 15
        page_param: URL 参数中的页码参数名，默认 "page"

    Returns:
        tuple: (分页对象, 当前页码)
            - 分页对象: Django Paginator 的 page 对象
            - 当前页码: 整数类型的页码

    Example:
        ```python
        from parking.utils.pagination import paginate_queryset

        queryset = ParkingLot.objects.all()
        page_obj, current_page = paginate_queryset(queryset, request, page_size=20)

        context = {
            "lots": page_obj,
            "current_page": current_page,
        }
        ```
    """
    paginator = Paginator(queryset, page_size)
    page = request.GET.get(page_param, 1)

    try:
        page_obj = paginator.page(page)
    except (PageNotAnInteger, EmptyPage):
        page_obj = paginator.page(1)
        page = 1

    return page_obj, int(page)
