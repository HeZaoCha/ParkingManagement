"""
停车场管理系统 API 视图

提供车辆入场、出场、查询等 AJAX API 接口。
所有接口返回 JSON 格式数据，供前端页面调用。

Author: HeZaoCha
Created: 2024-12-09
Last Modified: 2025-12-11
Version: 1.1.0
"""

import json
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET, require_POST
from loguru import logger

from parking.models import ParkingLot, ParkingSpace, validate_license_plate
from parking.services import (
    DashboardService,
    ParkingLotService,
    ParkingRecordService,
)


def api_response(
    success: bool, data: Any = None, message: str = "", error_code: str = ""
) -> JsonResponse:
    """
    统一的 API 响应格式

    Args:
        success: 操作是否成功
        data: 返回数据
        message: 提示消息
        error_code: 错误代码（失败时）

    Returns:
        JsonResponse: JSON 响应对象
    """
    response = {
        "success": success,
        "message": message,
    }

    if data is not None:
        response["data"] = data

    if error_code:
        response["error_code"] = error_code

    status_code = 200 if success else 400
    return JsonResponse(response, status=status_code)


@login_required
@require_POST
def api_vehicle_entry(request: HttpRequest) -> JsonResponse:
    """
    车辆入场 API

    处理车辆入场请求，验证车牌号并创建停车记录。

    请求参数（POST）：
        license_plate: 车牌号
        parking_lot_id: 停车场ID
        vehicle_type: 车辆类型（可选，默认 car）

    返回：
        success: 是否成功
        data: 入场信息（车位号、停车场等）
        message: 提示消息
    """
    try:
        # 解析请求数据
        if request.content_type == "application/json":
            data = json.loads(request.body)
        else:
            data = request.POST

        license_plate = data.get("license_plate", "").strip().upper()
        parking_lot_id = data.get("parking_lot_id") or data.get("parking_lot")
        vehicle_type = data.get("vehicle_type", "car")
        parking_space_id = data.get("parking_space_id")

        # 验证车牌号格式
        try:
            validate_license_plate(license_plate)
        except ValidationError as e:
            return api_response(
                success=False, message=str(e.message), error_code="invalid_license_plate"
            )

        # 验证停车场ID
        if not parking_lot_id:
            return api_response(success=False, message="请选择停车场", error_code="missing_lot")

        try:
            parking_lot_id = int(parking_lot_id)
        except (ValueError, TypeError):
            return api_response(
                success=False, message="无效的停车场ID", error_code="invalid_lot_id"
            )

        # 验证停车位ID（如果提供）
        if parking_space_id:
            try:
                parking_space_id = int(parking_space_id)
            except (ValueError, TypeError):
                return api_response(
                    success=False, message="无效的停车位ID", error_code="invalid_space_id"
                )
        else:
            parking_space_id = None

        # 调用服务层处理入场
        result = ParkingRecordService.vehicle_entry(
            license_plate=license_plate,
            parking_lot_id=parking_lot_id,
            vehicle_type=vehicle_type,
            operator_id=request.user.id,
            parking_space_id=parking_space_id,
        )

        if result.success:
            logger.info(
                "用户 %s 处理车辆入场: %s -> %s %s",
                request.user.username,
                license_plate,
                result.lot_name,
                result.space_number,
            )

            return api_response(
                success=True,
                data={
                    "license_plate": license_plate,
                    "parking_lot": result.lot_name,
                    "space_number": result.space_number,
                    "entry_time": result.record.entry_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "record_id": result.record.id,
                },
                message=result.message,
            )
        else:
            return api_response(success=False, message=result.message, error_code=result.error_code)

    except json.JSONDecodeError:
        return api_response(success=False, message="请求数据格式错误", error_code="invalid_json")
    except Exception as e:
        logger.exception("车辆入场API异常: %s", str(e))
        return api_response(
            success=False, message="系统错误，请稍后重试", error_code="server_error"
        )


@login_required
@require_POST
def api_vehicle_exit(request: HttpRequest) -> JsonResponse:
    """
    车辆出场 API

    处理车辆出场请求，计算费用并释放车位。

    请求参数（POST）：
        license_plate: 车牌号（与 record_id 二选一）
        record_id: 停车记录ID（与 license_plate 二选一）
        auto_pay: 是否自动标记为已支付（可选，默认 false）

    返回：
        success: 是否成功
        data: 出场信息（费用、时长等）
        message: 提示消息
    """
    try:
        if request.content_type == "application/json":
            data = json.loads(request.body)
        else:
            data = request.POST

        license_plate = data.get("license_plate", "").strip().upper() or None
        record_id = data.get("record_id")
        auto_pay = data.get("auto_pay", False)

        if isinstance(auto_pay, str):
            auto_pay = auto_pay.lower() in ("true", "1", "yes")

        # 转换 record_id 为整数
        if record_id:
            try:
                record_id = int(record_id)
            except (ValueError, TypeError):
                return api_response(
                    success=False, message="无效的记录ID", error_code="invalid_record_id"
                )

        # 验证车牌号格式（如果提供）
        if license_plate:
            try:
                validate_license_plate(license_plate)
            except ValidationError as e:
                return api_response(
                    success=False, message=str(e.message), error_code="invalid_license_plate"
                )

        # 调用服务层处理出场
        result = ParkingRecordService.vehicle_exit(
            license_plate=license_plate,
            record_id=record_id,
            operator_id=request.user.id,
            auto_pay=auto_pay,
        )

        if result.success:
            logger.info(
                "用户 %s 处理车辆出场: %s, 费用: ¥%s",
                request.user.username,
                result.record.vehicle.license_plate,
                result.fee,
            )

            return api_response(
                success=True,
                data={
                    "license_plate": result.record.vehicle.license_plate,
                    "fee": str(result.fee),
                    "duration_minutes": result.duration_minutes,
                    "entry_time": result.record.entry_time.strftime("%Y-%m-%d %H:%M"),
                    "exit_time": result.record.exit_time.strftime("%Y-%m-%d %H:%M"),
                    "is_paid": result.record.is_paid,
                },
                message=result.message,
            )
        else:
            return api_response(success=False, message=result.message, error_code=result.error_code)

    except json.JSONDecodeError:
        return api_response(success=False, message="请求数据格式错误", error_code="invalid_json")
    except Exception as e:
        logger.exception("车辆出场API异常: %s", str(e))
        return api_response(
            success=False, message="系统错误，请稍后重试", error_code="server_error"
        )


@require_GET
def api_vehicle_query(request: HttpRequest) -> JsonResponse:
    """
    车辆查询 API

    查询车辆停车状态和历史记录。

    请求参数（GET）：
        license_plate: 车牌号

    返回：
        success: 是否成功
        data: 车辆状态信息
        message: 提示消息
    """
    try:
        license_plate = request.GET.get("license_plate", "").strip().upper()

        if not license_plate:
            return api_response(success=False, message="请输入车牌号", error_code="missing_plate")

        # 查询车辆状态
        status = ParkingRecordService.query_vehicle_status(license_plate)

        # 检查是否为VIP车辆
        from parking.models import VIPVehicle

        try:
            vip = VIPVehicle.objects.get(license_plate=license_plate, is_active=True)
            status["is_vip"] = vip.is_valid
            status["vip_type"] = vip.get_vip_type_display() if vip.is_valid else None
        except VIPVehicle.DoesNotExist:
            status["is_vip"] = False

        # 格式化时间
        if status.get("entry_time"):
            status["entry_time"] = status["entry_time"].strftime("%Y-%m-%d %H:%M")
        if status.get("last_visit"):
            status["last_visit"] = status["last_visit"].strftime("%Y-%m-%d %H:%M")
        if status.get("current_fee"):
            status["current_fee"] = str(status["current_fee"])

        return api_response(
            success=True, data=status, message="查询成功" if status["found"] else "未找到该车辆"
        )

    except Exception as e:
        logger.exception("车辆查询API异常: %s", str(e))
        return api_response(
            success=False, message="查询失败，请稍后重试", error_code="server_error"
        )


@login_required
@require_GET
def api_search_records(request: HttpRequest) -> JsonResponse:
    """
    停车记录搜索 API

    搜索停车记录，支持多条件组合。

    请求参数（GET）：
        license_plate: 车牌号（模糊搜索）
        status: 状态筛选（active/exited/unpaid/paid）
        limit: 返回数量（默认20）

    返回：
        success: 是否成功
        data: 记录列表
    """
    try:
        license_plate = request.GET.get("license_plate", "").strip() or None
        status = request.GET.get("status", "") or None
        limit = min(int(request.GET.get("limit", 20)), 100)

        result = ParkingRecordService.search_records(
            license_plate=license_plate, status=status, limit=limit
        )

        records = []
        for record in result.records:
            records.append(
                {
                    "id": record.id,
                    "license_plate": record.vehicle.license_plate,
                    "vehicle_type": record.vehicle.get_vehicle_type_display(),
                    "parking_lot": record.parking_space.parking_lot.name,
                    "space_number": record.parking_space.space_number,
                    "entry_time": record.entry_time.strftime("%Y-%m-%d %H:%M"),
                    "exit_time": record.exit_time.strftime("%Y-%m-%d %H:%M")
                    if record.exit_time
                    else None,
                    "fee": str(record.fee) if record.fee else None,
                    "is_paid": record.is_paid,
                    "is_active": record.exit_time is None,
                }
            )

        return api_response(
            success=True,
            data={
                "records": records,
                "total_count": result.total_count,
                "has_more": result.has_more,
            },
        )

    except Exception as e:
        logger.exception("搜索记录API异常: %s", str(e))
        return api_response(success=False, message="搜索失败", error_code="server_error")


@require_GET
def api_dashboard_stats(request: HttpRequest) -> JsonResponse:
    """
    仪表盘统计数据 API

    获取实时的停车场统计数据。

    返回：
        success: 是否成功
        data: 统计数据
    """
    try:
        data = DashboardService.get_dashboard_data()

        # 格式化停车场数据
        parking_lots = []
        for lot in data["parking_lots"]:
            parking_lots.append(
                {
                    "id": lot["id"],
                    "name": lot["name"],
                    "address": lot["address"],
                    "total_spaces": lot["total_spaces"],
                    "occupied_spaces": lot["occupied_spaces"],
                    "available_spaces": lot["available_spaces"],
                    "hourly_rate": str(lot["hourly_rate"]),
                }
            )

        # 优化：格式化最近记录（dashboard_service已返回字典列表）
        # 只需要转换时间格式（从ISO格式转换为HH:MM）
        recent_records = []
        for record in data["recent_records"]:
            # record已经是字典格式（从缓存或服务层返回）
            formatted_record = record.copy()
            # 转换entry_time和exit_time为HH:MM格式（如果存在且是ISO格式）
            if "entry_time" in formatted_record and formatted_record["entry_time"]:
                try:
                    from datetime import datetime

                    # 处理ISO格式字符串
                    if (
                        isinstance(formatted_record["entry_time"], str)
                        and "T" in formatted_record["entry_time"]
                    ):
                        dt = datetime.fromisoformat(
                            formatted_record["entry_time"].replace("Z", "+00:00")
                        )
                        formatted_record["entry_time"] = dt.strftime("%H:%M")
                except (ValueError, AttributeError, TypeError):
                    # 如果已经是HH:MM格式或其他格式，保持原样
                    pass
            if "exit_time" in formatted_record and formatted_record["exit_time"]:
                try:
                    from datetime import datetime

                    if (
                        isinstance(formatted_record["exit_time"], str)
                        and "T" in formatted_record["exit_time"]
                    ):
                        dt = datetime.fromisoformat(
                            formatted_record["exit_time"].replace("Z", "+00:00")
                        )
                        formatted_record["exit_time"] = dt.strftime("%H:%M")
                except (ValueError, AttributeError, TypeError):
                    pass
            # 确保parking_lot字段存在（兼容性）
            if "parking_lot" not in formatted_record and "lot_name" in formatted_record:
                formatted_record["parking_lot"] = formatted_record["lot_name"]
            recent_records.append(formatted_record)

        return api_response(
            success=True,
            data={
                "total_lots": data["total_lots"],
                "total_spaces": data["total_spaces"],
                "occupied_spaces": data["occupied_spaces"],
                "available_spaces": data["available_spaces"],
                "today_count": data["today_count"],
                "today_revenue": str(data["today_revenue"]),
                "active_count": data["active_count"],
                "parking_lots": parking_lots,
                "recent_records": recent_records,
            },
        )

    except Exception as e:
        logger.exception("仪表盘统计API异常: %s", str(e))
        return api_response(success=False, message="获取数据失败", error_code="server_error")


@login_required
@require_GET
def api_parking_lot_detail(request: HttpRequest, lot_id: int) -> JsonResponse:
    """
    获取停车场详细信息 API

    返回停车场的详细信息，包括楼层和区域信息。
    """
    try:
        # 优化：使用only()限制字段，减少数据传输
        lot = ParkingLot.objects.only(
            "id", "name", "address", "lot_type", "floors", "areas", "total_spaces", "hourly_rate"
        ).get(id=lot_id, is_active=True)

        return api_response(
            success=True,
            data={
                "id": lot.id,
                "name": lot.name,
                "address": lot.address,
                "lot_type": lot.lot_type,
                "floors": lot.floors or [],
                "areas": lot.areas or {},
                "total_spaces": lot.total_spaces,
                "hourly_rate": str(lot.hourly_rate),
            },
            message="获取成功",
        )
    except ParkingLot.DoesNotExist:
        return api_response(success=False, message="停车场不存在", error_code="lot_not_found")
    except Exception as e:
        logger.exception("获取停车场详情失败")
        return api_response(success=False, message=f"获取失败: {str(e)}", error_code="server_error")


@login_required
@require_GET
def api_parking_lots(request: HttpRequest) -> JsonResponse:
    """
    获取可用停车场列表 API

    返回有可用车位的停车场列表，供入场表单选择。

    返回：
        success: 是否成功
        data: 停车场列表
    """
    try:
        lots = ParkingLotService.get_active_lots_with_availability()

        # 只返回有可用车位的停车场
        available_lots = [
            {
                "id": lot["id"],
                "name": lot["name"],
                "available_spaces": lot["available_spaces"],
                "total_spaces": lot["total_spaces"],
                "hourly_rate": str(lot["hourly_rate"]),
            }
            for lot in lots
            if lot["available_spaces"] > 0
        ]

        return api_response(success=True, data=available_lots)

    except Exception as e:
        logger.exception("获取停车场列表异常: %s", str(e))
        return api_response(success=False, message="获取数据失败", error_code="server_error")


@login_required
@require_GET
def api_available_spaces(request: HttpRequest) -> JsonResponse:
    """
    获取可用停车位列表 API

    根据停车场ID返回可用停车位列表。

    请求参数（GET）：
        parking_lot_id: 停车场ID

    返回：
        success: 是否成功
        data: 停车位列表
    """
    try:
        parking_lot_id = request.GET.get("parking_lot_id")

        if not parking_lot_id:
            return api_response(
                success=False, message="请提供停车场ID", error_code="missing_lot_id"
            )

        try:
            parking_lot_id = int(parking_lot_id)
        except (ValueError, TypeError):
            return api_response(
                success=False, message="无效的停车场ID", error_code="invalid_lot_id"
            )

        # 优化：使用values()直接获取需要的字段，避免加载完整对象
        spaces = (
            ParkingSpace.objects.filter(
                parking_lot_id=parking_lot_id, is_occupied=False, is_reserved=False
            )
            .order_by("space_number")
            .values("id", "space_number", "space_type")
        )

        spaces_list = list(spaces)

        return api_response(success=True, data={"spaces": spaces_list, "count": len(spaces_list)})

    except Exception as e:
        logger.exception("获取停车位列表异常: %s", str(e))
        return api_response(success=False, message="获取数据失败", error_code="server_error")


@login_required
@require_GET
def api_validate_plate(request: HttpRequest) -> JsonResponse:
    """
    车牌号验证 API

    验证车牌号格式是否正确。

    请求参数（GET）：
        license_plate: 车牌号

    返回：
        success: 是否有效
        message: 验证消息
    """
    try:
        license_plate = request.GET.get("license_plate", "").strip().upper()

        if not license_plate:
            return api_response(success=False, message="请输入车牌号", error_code="empty_plate")

        try:
            validate_license_plate(license_plate)
            return api_response(
                success=True, data={"license_plate": license_plate}, message="车牌号格式正确"
            )
        except ValidationError as e:
            return api_response(success=False, message=str(e.message), error_code="invalid_format")

    except Exception as e:
        logger.exception("车牌验证API异常: %s", str(e))
        return api_response(success=False, message="验证失败", error_code="server_error")
