"""
公安查询功能视图

提供按地区查询车辆停车记录的功能，方便公安部门获取停车信息。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.2.0
"""

from datetime import datetime
from decimal import Decimal

from django.core.paginator import Paginator
from django.db.models import Count, Q, Sum
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_GET

from parking.decorators import staff_member_required
from parking.license_plate_models import Province
from parking.models import ParkingRecord

PAGE_SIZE = 20


@staff_member_required
@require_GET
def police_query_view(request: HttpRequest) -> HttpResponse:
    """
    公安查询页面

    支持按省份、地级市、车牌号、日期范围等条件查询车辆停车记录。
    """
    # 获取查询参数
    province_code = request.GET.get("province", "").strip()
    city_code = request.GET.get("city", "").strip()
    license_plate = request.GET.get("license_plate", "").strip().upper()
    date_from = request.GET.get("date_from", "")
    date_to = request.GET.get("date_to", "")
    parking_lot_id = request.GET.get("parking_lot", "")

    # 构建查询
    queryset = ParkingRecord.objects.select_related(
        "vehicle", "parking_space", "parking_space__parking_lot", "operator"
    ).filter(
        exit_time__isnull=False  # 只查询已出场的记录
    )

    # 省份筛选
    if province_code:
        queryset = queryset.filter(plate_province_code=province_code)

    # 地级市筛选
    if city_code:
        queryset = queryset.filter(plate_city_code=city_code)

    # 车牌号筛选（支持模糊搜索）
    if license_plate:
        queryset = queryset.filter(
            Q(vehicle__license_plate__icontains=license_plate)
            | Q(plate_province_code__icontains=license_plate)
            | Q(plate_city_code__icontains=license_plate)
        )

    # 日期范围筛选
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, "%Y-%m-%d")
            queryset = queryset.filter(entry_time__date__gte=date_from_obj.date())
        except ValueError:
            pass

    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, "%Y-%m-%d")
            queryset = queryset.filter(entry_time__date__lte=date_to_obj.date())
        except ValueError:
            pass

    # 停车场筛选
    if parking_lot_id:
        queryset = queryset.filter(parking_space__parking_lot_id=parking_lot_id)

    # 默认查询今天的记录
    if not date_from and not date_to:
        today = timezone.now().date()
        queryset = queryset.filter(entry_time__date=today)

    # 排序
    queryset = queryset.order_by("-entry_time")

    # 分页
    paginator = Paginator(queryset, PAGE_SIZE)
    page = request.GET.get("page", 1)

    try:
        records = paginator.page(page)
    except Exception:
        records = paginator.page(1)

    # 统计信息
    stats = {
        "total_count": queryset.count(),
        "unique_vehicles": queryset.values("vehicle__license_plate").distinct().count(),
        "total_revenue": queryset.aggregate(total=Sum("fee")).get("total") or Decimal("0.00"),
        "avg_duration": queryset.aggregate(avg=Count("duration_minutes")),
    }

    # 获取省份列表（用于筛选）
    provinces = Province.objects.values_list("code", "name").order_by("code")

    context = {
        "records": records,
        "stats": stats,
        "provinces": provinces,
        "province_code": province_code,
        "city_code": city_code,
        "license_plate": license_plate,
        "date_from": date_from,
        "date_to": date_to,
        "parking_lot_id": parking_lot_id,
    }

    return render(request, "admin/police/query.html", context)


@staff_member_required
@require_GET
def police_query_api(request: HttpRequest) -> JsonResponse:
    """
    公安查询API（JSON格式）

    返回JSON格式的查询结果，方便前端调用。
    """
    # 获取查询参数（同police_query_view）
    province_code = request.GET.get("province", "").strip()
    city_code = request.GET.get("city", "").strip()
    license_plate = request.GET.get("license_plate", "").strip().upper()
    date_from = request.GET.get("date_from", "")
    date_to = request.GET.get("date_to", "")

    # 构建查询（同police_query_view）
    queryset = ParkingRecord.objects.select_related(
        "vehicle",
        "parking_space",
        "parking_space__parking_lot",
    ).filter(exit_time__isnull=False)

    if province_code:
        queryset = queryset.filter(plate_province_code=province_code)
    if city_code:
        queryset = queryset.filter(plate_city_code=city_code)
    if license_plate:
        queryset = queryset.filter(vehicle__license_plate__icontains=license_plate)
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, "%Y-%m-%d")
            queryset = queryset.filter(entry_time__date__gte=date_from_obj.date())
        except ValueError:
            pass
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, "%Y-%m-%d")
            queryset = queryset.filter(entry_time__date__lte=date_to_obj.date())
        except ValueError:
            pass

    # 默认查询今天
    if not date_from and not date_to:
        today = timezone.now().date()
        queryset = queryset.filter(entry_time__date=today)

    # 限制返回数量（API限制）
    limit = int(request.GET.get("limit", 100))
    records = list(queryset.order_by("-entry_time")[:limit])

    # 格式化数据
    data = []
    for record in records:
        data.append(
            {
                "license_plate": record.vehicle.license_plate,
                "province": record.plate_province_name or record.plate_province_code,
                "city": record.plate_city_name or record.plate_city_code,
                "parking_lot": record.parking_space.parking_lot.name,
                "area": record.parking_space.area or "",
                "floor": record.parking_space.floor or "",
                "space_number": record.parking_space.space_number,
                "entry_time": record.entry_time.strftime("%Y-%m-%d %H:%M:%S"),
                "exit_time": record.exit_time.strftime("%Y-%m-%d %H:%M:%S")
                if record.exit_time
                else "",
                "duration_minutes": record.duration_minutes or 0,
                "fee": float(record.fee) if record.fee else 0,
            }
        )

    return JsonResponse(
        {
            "success": True,
            "data": data,
            "total": len(data),
        }
    )
