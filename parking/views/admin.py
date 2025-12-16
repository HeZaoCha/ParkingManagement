"""
自定义管理后台视图模块

提供停车场管理系统的自定义管理界面，替代Django默认admin。
包含数据列表、详情、编辑、删除等CRUD操作。

Author: HeZaoCha
Created: 2024-12-10
Last Modified: 2025-12-11
Version: 1.1.0
"""

import json
from decimal import Decimal

from django.contrib import messages

# 导入删除视图函数供 urls.py 使用
from parking.views.admin_delete_views import (  # noqa: F401
    parking_lot_delete,
    parking_space_delete,
    vehicle_delete,
)
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.vary import vary_on_headers
from loguru import logger

from parking.decorators import staff_member_required
from parking.models import ParkingLot, ParkingRecord, ParkingSpace, Vehicle
from parking.services import DashboardService
from parking.utils.pagination import paginate_queryset

# 每页显示数量
PAGE_SIZE = 15


@staff_member_required
@cache_page(60 * 5)  # 缓存5分钟
@vary_on_headers("Cookie")  # 根据用户Cookie区分缓存
def admin_index(request: HttpRequest) -> HttpResponse:
    """
    管理后台首页

    显示系统概览和快捷操作入口。
    """
    dashboard_data = DashboardService.get_dashboard_data()

    # 计算使用率
    total_spaces = dashboard_data.get("total_spaces", 0)
    occupied = dashboard_data.get("occupied_spaces", 0)
    occupancy_rate = round((occupied / total_spaces * 100) if total_spaces > 0 else 0)

    # 优化：使用aggregate合并统计查询，减少数据库访问
    from django.db.models import Count, Q

    stats = ParkingRecord.objects.aggregate(
        total_records=Count("id"),
        unpaid_count=Count("id", filter=Q(exit_time__isnull=False, is_paid=False)),
    )
    total_vehicles = Vehicle.objects.count()  # 车辆总数查询较快，单独查询

    context = {
        "today_revenue": dashboard_data.get("today_revenue", 0),
        "current_vehicles": dashboard_data.get("active_count", 0),
        "total_spaces": total_spaces,
        "available_spaces": dashboard_data.get("available_spaces", 0),
        "occupancy_rate": occupancy_rate,
        "recent_records": dashboard_data.get("recent_records", []),
        "total_vehicles": total_vehicles,
        "total_records": stats["total_records"],
        "unpaid_count": stats["unpaid_count"],
    }

    return render(request, "admin/index.html", context)


# ==================== 停车场管理 ====================


@staff_member_required
def parking_lot_list(request: HttpRequest) -> HttpResponse:
    """停车场列表视图"""
    queryset = ParkingLot.objects.annotate(
        space_count=Count("parking_spaces"),
        occupied_count=Count("parking_spaces", filter=Q(parking_spaces__is_occupied=True)),
    ).order_by("-created_at")

    # 搜索
    search = request.GET.get("search", "").strip()
    if search:
        queryset = queryset.filter(Q(name__icontains=search) | Q(address__icontains=search))

    # 状态筛选
    status = request.GET.get("status")
    if status == "active":
        queryset = queryset.filter(is_active=True)
    elif status == "inactive":
        queryset = queryset.filter(is_active=False)

    # 使用通用分页函数
    lots, current_page = paginate_queryset(queryset, request, page_size=PAGE_SIZE)

    context = {
        "lots": lots,
        "search": search,
        "status": status,
        "total_count": queryset.count(),
        "current_page": current_page,
    }

    return render(request, "admin/parking_lot/list.html", context)


@staff_member_required
def parking_lot_detail(request: HttpRequest, pk: int) -> HttpResponse:
    """停车场详情视图"""
    lot = get_object_or_404(ParkingLot, pk=pk)

    # 优化：使用aggregate合并统计查询，使用prefetch_related预加载
    from django.db.models import Count, Q

    space_stats = lot.parking_spaces.aggregate(
        total=Count("id"),
        occupied=Count("id", filter=Q(is_occupied=True)),
        reserved=Count("id", filter=Q(is_reserved=True)),
    )
    space_stats["available"] = space_stats["total"] - space_stats["occupied"]

    # 优化：使用select_related和only()减少查询和传输数据
    recent_records = (
        ParkingRecord.objects.filter(parking_space__parking_lot=lot)
        .select_related("vehicle", "parking_space")
        .only(
            "id",
            "entry_time",
            "exit_time",
            "fee",
            "is_paid",
            "vehicle__license_plate",
            "parking_space__space_number",
        )
        .order_by("-entry_time")[:10]
    )

    # 优化：使用prefetch_related预加载车位，限制数量
    spaces = lot.parking_spaces.select_related().only(
        "id", "space_number", "floor", "area", "space_type", "is_occupied", "is_reserved"
    )[:50]  # 只显示前50个车位

    context = {
        "lot": lot,
        "space_stats": space_stats,
        "spaces": spaces,
        "recent_records": recent_records,
    }

    return render(request, "admin/parking_lot/detail.html", context)


@staff_member_required
@require_http_methods(["GET", "POST"])
def parking_lot_edit(request: HttpRequest, pk: int = None) -> HttpResponse:
    """停车场编辑/新增视图"""
    lot = get_object_or_404(ParkingLot, pk=pk) if pk else None

    if request.method == "POST":
        try:
            with transaction.atomic():
                if lot is None:
                    lot = ParkingLot()

                lot.name = request.POST.get("name", "").strip()
                lot.address = request.POST.get("address", "").strip()
                lot.total_spaces = int(request.POST.get("total_spaces", 0))
                lot.hourly_rate = Decimal(request.POST.get("hourly_rate", "5.00"))
                lot.is_active = request.POST.get("is_active") == "on"

                # 处理停车场类型、楼层、区域
                lot.lot_type = request.POST.get("lot_type", "outdoor")

                # 处理楼层（JSON格式）
                floors_str = request.POST.get("floors", "[]")
                try:
                    lot.floors = json.loads(floors_str) if floors_str else []
                except (json.JSONDecodeError, ValueError):
                    lot.floors = []

                # 处理区域（JSON格式）
                areas_str = request.POST.get("areas", "{}")
                try:
                    lot.areas = json.loads(areas_str) if areas_str else {}
                except (json.JSONDecodeError, ValueError):
                    lot.areas = {}

                lot.full_clean()
                lot.save()

                messages.success(request, f'停车场 "{lot.name}" 保存成功！')
                logger.info("用户 %s 保存停车场: %s", request.user.username, lot.name)
                return redirect("parking:admin_parking_lot_list")

        except Exception as e:
            messages.error(request, f"保存失败：{str(e)}")
            logger.error("保存停车场失败: %s", str(e))

    return render(request, "admin/parking_lot/edit.html", {"lot": lot})


# 停车场删除视图已迁移到 parking.views.admin_delete_views.ParkingLotDeleteView
# 使用导入的 parking_lot_delete 视图函数


@staff_member_required
@require_POST
def parking_lot_toggle_status(request: HttpRequest, pk: int) -> JsonResponse:
    """切换停车场状态（AJAX）"""
    try:
        lot = get_object_or_404(ParkingLot, pk=pk)
        lot.is_active = not lot.is_active
        lot.save(update_fields=["is_active", "updated_at"])

        status_text = "启用" if lot.is_active else "禁用"
        logger.info("用户 %s %s停车场: %s", request.user.username, status_text, lot.name)

        return JsonResponse(
            {"success": True, "is_active": lot.is_active, "message": f"停车场已{status_text}"}
        )

    except Exception as e:
        return JsonResponse({"success": False, "message": f"操作失败：{str(e)}"})


# ==================== 车位管理 ====================


@staff_member_required
def parking_space_list(request: HttpRequest) -> HttpResponse:
    """车位列表视图"""
    queryset = ParkingSpace.objects.select_related("parking_lot").order_by(
        "parking_lot__name", "space_number"
    )

    # 搜索
    search = request.GET.get("search", "").strip()
    if search:
        queryset = queryset.filter(
            Q(space_number__icontains=search) | Q(parking_lot__name__icontains=search)
        )

    # 停车场筛选
    lot_id = request.GET.get("lot")
    if lot_id:
        queryset = queryset.filter(parking_lot_id=lot_id)

    # 状态筛选
    status = request.GET.get("status")
    if status == "occupied":
        queryset = queryset.filter(is_occupied=True)
    elif status == "available":
        queryset = queryset.filter(is_occupied=False)
    elif status == "reserved":
        queryset = queryset.filter(is_reserved=True)

    # 使用通用分页函数
    spaces, current_page = paginate_queryset(queryset, request, page_size=PAGE_SIZE)

    # 优化：使用only()限制字段，减少数据传输
    lots = ParkingLot.objects.filter(is_active=True).only("id", "name")

    context = {
        "spaces": spaces,
        "lots": lots,
        "search": search,
        "lot_id": lot_id,
        "status": status,
        "total_count": queryset.count(),
    }

    return render(request, "admin/parking_space/list.html", context)


@staff_member_required
@require_http_methods(["GET", "POST"])
def parking_space_edit(request: HttpRequest, pk: int = None) -> HttpResponse:
    """车位编辑/新增视图"""
    space = get_object_or_404(ParkingSpace, pk=pk) if pk else None

    if request.method == "POST":
        try:
            with transaction.atomic():
                if space is None:
                    space = ParkingSpace()

                space.parking_lot_id = int(request.POST.get("parking_lot"))
                space.space_number = request.POST.get("space_number", "").strip()
                space.space_type = request.POST.get("space_type", "standard")
                space.is_reserved = request.POST.get("is_reserved") == "on"

                # 处理楼层和区域
                space.floor = request.POST.get("floor", "").strip() or None
                space.area = request.POST.get("area", "").strip() or None

                space.full_clean()
                space.save()

                messages.success(request, f'车位 "{space.space_number}" 保存成功！')
                return redirect("parking:admin_parking_space_list")

        except Exception as e:
            messages.error(request, f"保存失败：{str(e)}")

    # 优化：使用only()限制字段
    lots = ParkingLot.objects.filter(is_active=True).only("id", "name")

    context = {
        "space": space,
        "lots": lots,
        "space_types": ParkingSpace.SPACE_TYPE_CHOICES,
    }

    return render(request, "admin/parking_space/edit.html", context)


# 车位删除视图已迁移到 parking.views.admin_delete_views.ParkingSpaceDeleteView
# 使用导入的 parking_space_delete 视图函数


@staff_member_required
@require_POST
def parking_space_batch_create(request: HttpRequest) -> JsonResponse:
    """批量创建车位（AJAX）"""
    try:
        data = json.loads(request.body)
        lot_id = data.get("lot_id")
        prefix = data.get("prefix", "A")
        start = int(data.get("start", 1))
        count = int(data.get("count", 10))
        space_type = data.get("space_type", "standard")

        if count > 100:
            return JsonResponse({"success": False, "message": "单次最多创建100个车位"})

        lot = get_object_or_404(ParkingLot, pk=lot_id)

        created = 0
        with transaction.atomic():
            for i in range(start, start + count):
                number = f"{prefix}{str(i).zfill(3)}"
                _, is_created = ParkingSpace.objects.get_or_create(
                    parking_lot=lot, space_number=number, defaults={"space_type": space_type}
                )
                if is_created:
                    created += 1

        return JsonResponse({"success": True, "message": f"成功创建 {created} 个车位"})

    except Exception as e:
        return JsonResponse({"success": False, "message": f"创建失败：{str(e)}"})


# ==================== 车辆管理 ====================


@staff_member_required
def vehicle_list(request: HttpRequest) -> HttpResponse:
    """车辆列表视图"""
    queryset = Vehicle.objects.annotate(record_count=Count("parking_records")).order_by(
        "-created_at"
    )

    # 搜索
    search = request.GET.get("search", "").strip()
    if search:
        queryset = queryset.filter(
            Q(license_plate__icontains=search)
            | Q(owner_name__icontains=search)
            | Q(owner_phone__icontains=search)
        )

    # 类型筛选
    vehicle_type = request.GET.get("type")
    if vehicle_type:
        queryset = queryset.filter(vehicle_type=vehicle_type)

    # 使用通用分页函数
    vehicles, current_page = paginate_queryset(queryset, request, page_size=PAGE_SIZE)

    context = {
        "vehicles": vehicles,
        "search": search,
        "vehicle_type": vehicle_type,
        "vehicle_types": Vehicle.VEHICLE_TYPE_CHOICES,
        "total_count": queryset.count(),
    }

    return render(request, "admin/vehicle/list.html", context)


@staff_member_required
@require_http_methods(["GET", "POST"])
def vehicle_edit(request: HttpRequest, pk: int = None) -> HttpResponse:
    """车辆编辑/新增视图"""
    vehicle = get_object_or_404(Vehicle, pk=pk) if pk else None

    if request.method == "POST":
        try:
            with transaction.atomic():
                if vehicle is None:
                    vehicle = Vehicle()

                vehicle.license_plate = request.POST.get("license_plate", "").strip().upper()
                vehicle.vehicle_type = request.POST.get("vehicle_type", "car")
                vehicle.owner_name = request.POST.get("owner_name", "").strip()
                vehicle.owner_phone = request.POST.get("owner_phone", "").strip()

                vehicle.full_clean()
                vehicle.save()

                messages.success(request, f'车辆 "{vehicle.license_plate}" 保存成功！')
                return redirect("parking:admin_vehicle_list")

        except Exception as e:
            messages.error(request, f"保存失败：{str(e)}")

    context = {
        "vehicle": vehicle,
        "vehicle_types": Vehicle.VEHICLE_TYPE_CHOICES,
    }

    return render(request, "admin/vehicle/edit.html", context)


# 车辆删除视图已迁移到 parking.views.admin_delete_views.VehicleDeleteView
# 使用导入的 vehicle_delete 视图函数


# ==================== 停车记录管理 ====================


@staff_member_required
def parking_record_list(request: HttpRequest) -> HttpResponse:
    """停车记录列表视图"""
    queryset = ParkingRecord.objects.select_related(
        "vehicle", "parking_space", "parking_space__parking_lot", "operator"
    ).order_by("-entry_time")

    # 搜索
    search = request.GET.get("search", "").strip()
    if search:
        queryset = queryset.filter(
            Q(vehicle__license_plate__icontains=search)
            | Q(parking_space__space_number__icontains=search)
        )

    # 状态筛选
    status = request.GET.get("status")
    if status == "active":
        queryset = queryset.filter(exit_time__isnull=True)
    elif status == "completed":
        queryset = queryset.filter(exit_time__isnull=False)
    elif status == "unpaid":
        queryset = queryset.filter(exit_time__isnull=False, is_paid=False)
    elif status == "paid":
        queryset = queryset.filter(is_paid=True)

    # 日期筛选
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")
    if date_from:
        queryset = queryset.filter(entry_time__date__gte=date_from)
    if date_to:
        queryset = queryset.filter(entry_time__date__lte=date_to)

    # 使用通用分页函数
    records, current_page = paginate_queryset(queryset, request, page_size=PAGE_SIZE)

    # 优化：使用aggregate合并统计查询，减少数据库访问
    stats = queryset.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(exit_time__isnull=True)),
        total_revenue=Sum("fee", filter=Q(is_paid=True)),
    )
    stats["total_revenue"] = stats["total_revenue"] or Decimal("0.00")

    context = {
        "records": records,
        "search": search,
        "status": status,
        "date_from": date_from,
        "date_to": date_to,
        "stats": stats,
        "current_page": current_page,
    }

    return render(request, "admin/parking_record/list.html", context)


@staff_member_required
def parking_record_detail(request: HttpRequest, pk: int) -> HttpResponse:
    """停车记录详情视图"""
    record = get_object_or_404(
        ParkingRecord.objects.select_related("vehicle", "parking_space__parking_lot", "operator"),
        pk=pk,
    )

    return render(request, "admin/parking_record/detail.html", {"record": record})


@staff_member_required
@require_POST
def parking_record_checkout(request: HttpRequest, pk: int) -> JsonResponse:
    """停车记录结算（AJAX）"""
    try:
        with transaction.atomic():
            record = get_object_or_404(ParkingRecord, pk=pk)

            if record.exit_time:
                return JsonResponse({"success": False, "message": "该记录已出场"})

            record.exit_time = timezone.now()
            record.operator = request.user
            record.save()

            # 释放车位
            space = record.parking_space
            space.is_occupied = False
            space.save(update_fields=["is_occupied", "updated_at"])

            logger.info(
                "用户 %s 处理出场: 车牌 %s, 费用 %s",
                request.user.username,
                record.vehicle.license_plate,
                record.fee,
            )

            return JsonResponse(
                {
                    "success": True,
                    "fee": str(record.fee),
                    "duration": record.duration_minutes,
                    "message": f"出场成功，费用：¥{record.fee}",
                }
            )

    except Exception as e:
        return JsonResponse({"success": False, "message": f"操作失败：{str(e)}"})


@staff_member_required
@require_POST
def parking_record_pay(request: HttpRequest, pk: int) -> JsonResponse:
    """停车记录支付（AJAX）"""
    try:
        record = get_object_or_404(ParkingRecord, pk=pk)

        if record.is_paid:
            return JsonResponse({"success": False, "message": "该记录已支付"})

        if not record.exit_time:
            return JsonResponse({"success": False, "message": "请先办理出场"})

        record.is_paid = True
        record.save(update_fields=["is_paid", "updated_at"])

        logger.info(
            "用户 %s 确认支付: 车牌 %s, 费用 %s",
            request.user.username,
            record.vehicle.license_plate,
            record.fee,
        )

        return JsonResponse({"success": True, "message": "支付确认成功"})

    except Exception as e:
        return JsonResponse({"success": False, "message": f"操作失败：{str(e)}"})
