"""
通用视图基类

提供可复用的 CRUD 视图基类，减少重复代码。

Author: HeZaoCha
Created: 2025-12-15
Version: 1.0.0
"""

from typing import Any, Optional

from django.contrib import messages
from django.db import transaction
from django.db.models import Model, QuerySet
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods, require_POST
from loguru import logger

from parking.decorators import staff_member_required
from parking.utils.pagination import paginate_queryset


class BaseListView:
    """
    通用列表视图基类

    提供标准的列表视图功能，包括搜索、筛选、分页等。

    Attributes:
        model: Django 模型类
        template_name: 模板路径
        page_size: 每页显示数量，默认 15
        search_fields: 搜索字段列表，如 ["name", "address"]
        filter_fields: 筛选字段映射，如 {"is_active": "status"}
        order_by: 排序字段，默认 "-created_at"
        context_object_name: 上下文对象名称，默认 "objects"
    """

    model: type[Model] = None
    template_name: str = None
    page_size: int = 15
    search_fields: list[str] = []
    filter_fields: dict[str, str] = {}
    order_by: str = "-created_at"
    context_object_name: str = "objects"

    @classmethod
    def as_view(cls):
        """
        创建视图函数

        Returns:
            callable: 视图函数
        """

        @staff_member_required
        def view(request: HttpRequest) -> HttpResponse:
            queryset = cls.get_queryset(request)
            queryset = cls.apply_filters(request, queryset)
            queryset = cls.apply_search(request, queryset)
            queryset = cls.apply_ordering(request, queryset)

            page_obj, current_page = paginate_queryset(queryset, request, page_size=cls.page_size)

            context = cls.get_context_data(request, page_obj, current_page)
            return render(request, cls.template_name, context)

        return view

    @classmethod
    def get_queryset(cls, request: HttpRequest) -> QuerySet:
        """
        获取基础查询集

        子类可以重写此方法以自定义查询逻辑。

        Args:
            request: HTTP 请求对象

        Returns:
            QuerySet: Django 查询集
        """
        return cls.model.objects.all()

    @classmethod
    def apply_filters(cls, request: HttpRequest, queryset: QuerySet) -> QuerySet:
        """
        应用筛选条件

        Args:
            request: HTTP 请求对象
            queryset: 查询集

        Returns:
            QuerySet: 筛选后的查询集
        """
        for field, param_name in cls.filter_fields.items():
            value = request.GET.get(param_name)
            if value:
                queryset = queryset.filter(**{field: value})
        return queryset

    @classmethod
    def apply_search(cls, request: HttpRequest, queryset: QuerySet) -> QuerySet:
        """
        应用搜索条件

        Args:
            request: HTTP 请求对象
            queryset: 查询集

        Returns:
            QuerySet: 搜索后的查询集
        """
        search = request.GET.get("search", "").strip()
        if search and cls.search_fields:
            from django.db.models import Q

            q_objects = Q()
            for field in cls.search_fields:
                q_objects |= Q(**{f"{field}__icontains": search})
            queryset = queryset.filter(q_objects)
        return queryset

    @classmethod
    def apply_ordering(cls, request: HttpRequest, queryset: QuerySet) -> QuerySet:
        """
        应用排序

        Args:
            request: HTTP 请求对象
            queryset: 查询集

        Returns:
            QuerySet: 排序后的查询集
        """
        if cls.order_by:
            queryset = queryset.order_by(cls.order_by)
        return queryset

    @classmethod
    def get_context_data(cls, request: HttpRequest, page_obj, current_page: int) -> dict[str, Any]:
        """
        获取模板上下文数据

        子类可以重写此方法以添加额外的上下文数据。

        Args:
            request: HTTP 请求对象
            page_obj: 分页对象
            current_page: 当前页码

        Returns:
            dict: 上下文数据字典
        """
        context = {
            cls.context_object_name: page_obj,
            "search": request.GET.get("search", ""),
            "total_count": page_obj.paginator.count,
            "current_page": current_page,
        }
        # 添加筛选参数到上下文
        for field, param_name in cls.filter_fields.items():
            value = request.GET.get(param_name)
            if value:
                context[param_name] = value
        return context


class BaseEditView:
    """
    通用编辑视图基类

    提供标准的创建/编辑视图功能。

    Attributes:
        model: Django 模型类
        template_name: 模板路径
        form_class: 表单类（可选）
        success_url: 成功后的重定向 URL（URL 名称）
        success_message: 成功消息模板，支持 {obj} 占位符
        context_object_name: 上下文对象名称，默认 "obj"
    """

    model: type[Model] = None
    template_name: str = None
    form_class: type = None
    success_url: str = None
    success_message: str = "保存成功！"
    context_object_name: str = "obj"

    @classmethod
    def as_view(cls):
        """
        创建视图函数

        Returns:
            callable: 视图函数
        """

        @staff_member_required
        @require_http_methods(["GET", "POST"])
        def view(request: HttpRequest, pk: int = None) -> HttpResponse:
            obj = get_object_or_404(cls.model, pk=pk) if pk else None

            if request.method == "POST":
                return cls.handle_post(request, obj)

            context = cls.get_context_data(request, obj)
            return render(request, cls.template_name, context)

        return view

    @classmethod
    def handle_post(cls, request: HttpRequest, obj: Optional[Model]) -> HttpResponse:
        """
        处理 POST 请求

        Args:
            request: HTTP 请求对象
            obj: 模型对象（编辑时）或 None（创建时）

        Returns:
            HttpResponse: 重定向响应或错误页面
        """
        try:
            with transaction.atomic():
                if obj is None:
                    obj = cls.model()

                obj = cls.update_object(request, obj)
                obj.full_clean()
                obj.save()

                message = cls.success_message.format(obj=str(obj))
                messages.success(request, message)
                logger.info(
                    "用户 %s %s %s: %s",
                    request.user.username,
                    "创建" if obj.pk is None else "更新",
                    cls.model.__name__,
                    str(obj),
                )
                return redirect(cls.success_url)
        except Exception as e:
            messages.error(request, f"保存失败：{str(e)}")
            logger.error(f"保存 {cls.model.__name__} 失败: {str(e)}")
            # 返回编辑页面，显示错误
            context = cls.get_context_data(request, obj)
            return render(request, cls.template_name, context)

    @classmethod
    def update_object(cls, request: HttpRequest, obj: Model) -> Model:
        """
        更新对象属性

        子类必须重写此方法以实现具体的字段更新逻辑。

        Args:
            request: HTTP 请求对象
            obj: 模型对象

        Returns:
            Model: 更新后的模型对象

        Raises:
            NotImplementedError: 如果子类未实现此方法
        """
        raise NotImplementedError("子类必须实现 update_object 方法")

    @classmethod
    def get_context_data(cls, request: HttpRequest, obj: Optional[Model]) -> dict[str, Any]:
        """
        获取模板上下文数据

        子类可以重写此方法以添加额外的上下文数据。

        Args:
            request: HTTP 请求对象
            obj: 模型对象或 None

        Returns:
            dict: 上下文数据字典
        """
        return {cls.context_object_name: obj}


class BaseDeleteView:
    """
    通用删除视图基类

    提供标准的删除视图功能，包括关联检查。

    Attributes:
        model: Django 模型类
        check_relations: 关联检查字段列表，如 ["parking_spaces"]
        success_message: 成功消息模板，支持 {name} 占位符
    """

    model: type[Model] = None
    check_relations: list[str] = []
    success_message: str = '"{name}" 已删除'

    @classmethod
    def check_custom_relations(cls, request: HttpRequest, obj: Model) -> Optional[JsonResponse]:
        """
        自定义关联检查

        子类可以重写此方法以实现更复杂的关联检查逻辑。

        Args:
            request: HTTP 请求对象
            obj: 模型对象

        Returns:
            JsonResponse: 如果有问题则返回错误响应，否则返回 None
        """
        return None

    @classmethod
    def as_view(cls):
        """
        创建视图函数

        Returns:
            callable: 视图函数
        """

        @staff_member_required
        @require_POST
        def view(request: HttpRequest, pk: int) -> JsonResponse:
            obj = get_object_or_404(cls.model, pk=pk)

            # 检查关联数据
            for relation_field in cls.check_relations:
                if hasattr(obj, relation_field):
                    related_objects = getattr(obj, relation_field)
                    if hasattr(related_objects, "exists") and related_objects.exists():
                        return JsonResponse(
                            {"success": False, "message": "该记录存在关联数据，无法删除"}
                        )

            name = str(obj)
            obj.delete()
            logger.info(f"用户 {request.user.username} 删除 {cls.model.__name__}: {name}")

            message = cls.success_message.format(name=name)
            return JsonResponse({"success": True, "message": message})

        return view
