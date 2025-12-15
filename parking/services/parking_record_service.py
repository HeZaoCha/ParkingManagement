"""
停车记录服务

从 parking.services 迁移
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from django.db import DatabaseError, transaction
from django.db.models import QuerySet, Sum
from django.utils import timezone
from loguru import logger

from parking.models.parking_lot import ParkingLot
from parking.models.parking_record import ParkingRecord
from parking.models.parking_space import ParkingSpace
from parking.models.vehicle import Vehicle
from parking.services.data_classes import EntryResult, ExitResult, QueryResult
from parking.services.vehicle_service import VehicleService

# 缓存键前缀和TTL
CACHE_KEY_PREFIX = "parking:"
CACHE_TTL_SHORT = 60  # 1分钟


class ParkingRecordService:
    """
    停车记录服务类

    提供停车记录相关的业务操作，包括入场、出场、查询等。

    安全特性：
    - 使用 select_for_update 防止并发修改
    - 使用事务确保数据一致性
    - 严格的状态检查防止重复操作
    """

    @staticmethod
    @transaction.atomic
    def vehicle_entry(
        license_plate: str,
        parking_lot_id: int,
        vehicle_type: str = "car",
        operator_id: int | None = None,
        parking_space_id: int | None = None,
    ) -> EntryResult:
        """
        车辆入场（完整流程）

        包含：检查车辆状态、查找车位、创建记录、更新车位状态。
        使用行级锁和事务确保并发安全。

        Args:
            license_plate: 车牌号
            parking_lot_id: 停车场ID
            vehicle_type: 车辆类型
            operator_id: 操作员ID
            parking_space_id: 指定停车位ID（可选，不指定则自动分配）

        Returns:
            EntryResult: 入场操作结果
        """
        normalized_plate = license_plate.upper().strip()

        try:
            # 1. 检查车辆是否已在场内
            is_parked, active_record = VehicleService.is_vehicle_parked(normalized_plate)
            if is_parked and active_record:
                lot_name = active_record.parking_space.parking_lot.name
                return EntryResult(
                    success=False,
                    message=f"车辆已在 {lot_name} 停车",
                    error_code="vehicle_already_parked",
                )

            # 2. 获取停车场
            try:
                parking_lot = ParkingLot.objects.get(pk=parking_lot_id, is_active=True)
            except ParkingLot.DoesNotExist:
                return EntryResult(
                    success=False, message="停车场不存在或已停止运营", error_code="lot_not_found"
                )

            # 3. 查找或验证停车位
            if parking_space_id:
                # 指定停车位：验证停车位是否可用
                try:
                    parking_space = ParkingSpace.objects.select_for_update(skip_locked=True).get(
                        pk=parking_space_id,
                        parking_lot_id=parking_lot_id,
                        is_occupied=False,
                        is_reserved=False,
                    )
                except ParkingSpace.DoesNotExist:
                    return EntryResult(
                        success=False,
                        message="指定的停车位不存在、已被占用或已预留",
                        error_code="space_unavailable",
                    )
            else:
                # 自动分配：查找可用车位（使用行级锁）
                parking_space = (
                    ParkingSpace.objects.select_for_update(
                        skip_locked=True  # 跳过已锁定的行，提高并发性能
                    )
                    .filter(parking_lot_id=parking_lot_id, is_occupied=False, is_reserved=False)
                    .first()
                )

                if not parking_space:
                    return EntryResult(
                        success=False,
                        message=f"停车场 {parking_lot.name} 已无可用车位",
                        error_code="no_available_space",
                    )

            # 4. 获取或创建车辆
            vehicle = VehicleService.get_or_create_vehicle(
                license_plate=normalized_plate, vehicle_type=vehicle_type
            )

            # 5. 标记车位为已占用
            parking_space.is_occupied = True
            parking_space.save(update_fields=["is_occupied", "updated_at"])

            # 清除相关缓存
            from parking.services.dashboard_service import DashboardService

            DashboardService.invalidate_cache()

            # 6. 获取车牌号地址信息（延迟导入避免循环依赖）
            try:
                from parking.license_plate_models import LicensePlateLocation

                location_info = LicensePlateLocation.get_location_by_plate(normalized_plate)
            except (ImportError, AttributeError):
                location_info = {}

            # 7. 创建停车记录（包含地址信息）
            record = ParkingRecord.objects.create(
                vehicle=vehicle,
                parking_space=parking_space,
                entry_time=timezone.now(),
                operator_id=operator_id,
                plate_province_code=location_info.get("province_code", ""),
                plate_province_name=location_info.get("province_name", ""),
                plate_city_code=location_info.get("city_code", ""),
                plate_city_name=location_info.get("city_name", ""),
            )

            # 8. 检查是否为通缉车辆（延迟导入避免循环依赖）
            try:
                from parking.license_plate_models import WantedVehicle, VehicleAlertLog

                wanted_vehicles = WantedVehicle.objects.filter(
                    license_plate=normalized_plate, status="active"
                ).order_by("-priority")

                if wanted_vehicles.exists():
                    # 创建警报日志
                    for wanted in wanted_vehicles:
                        VehicleAlertLog.objects.create(wanted_vehicle=wanted, parking_record=record)
                        # 通知管理员（这里可以扩展为发送邮件、短信等）
                        logger.warning(
                            "⚠️ 通缉车辆入场警报: 车牌=%s, 优先级=%s, 记录ID=%s",
                            normalized_plate,
                            wanted.priority,
                            record.id,
                        )
            except (ImportError, AttributeError):
                pass

            logger.info(
                "车辆入场成功: 车牌=%s, 停车场=%s, 车位=%s",
                normalized_plate,
                parking_lot.name,
                parking_space.space_number,
            )

            return EntryResult(
                success=True,
                record=record,
                space_number=parking_space.space_number,
                lot_name=parking_lot.name,
                message=f"入场成功，车位号: {parking_space.space_number}",
            )

        except DatabaseError as e:
            logger.error("车辆入场数据库错误: %s", str(e))
            return EntryResult(
                success=False, message="系统繁忙，请稍后重试", error_code="database_error"
            )
        except Exception as e:
            logger.exception("车辆入场异常: %s", str(e))
            return EntryResult(
                success=False, message="入场失败，请联系管理员", error_code="unknown_error"
            )

    @staticmethod
    @transaction.atomic
    def vehicle_exit(
        license_plate: str | None = None,
        record_id: int | None = None,
        operator_id: int | None = None,
        auto_pay: bool = False,
    ) -> ExitResult:
        """
        车辆出场（完整流程）

        支持通过车牌号或记录ID出场。
        使用行级锁确保并发安全。

        Args:
            license_plate: 车牌号（与 record_id 二选一）
            record_id: 停车记录ID（与 license_plate 二选一）
            operator_id: 操作员ID
            auto_pay: 是否自动标记为已支付

        Returns:
            ExitResult: 出场操作结果
        """
        try:
            # 1. 查找停车记录（使用行级锁）
            if record_id:
                try:
                    record = (
                        ParkingRecord.objects.select_for_update()
                        .select_related("vehicle", "parking_space__parking_lot")
                        .get(pk=record_id)
                    )
                except ParkingRecord.DoesNotExist:
                    return ExitResult(
                        success=False, message="停车记录不存在", error_code="record_not_found"
                    )
            elif license_plate:
                normalized_plate = license_plate.upper().strip()
                record = (
                    ParkingRecord.objects.select_for_update()
                    .select_related("vehicle", "parking_space__parking_lot")
                    .filter(vehicle__license_plate=normalized_plate, exit_time__isnull=True)
                    .first()
                )

                if not record:
                    return ExitResult(
                        success=False,
                        message=f"未找到车牌 {normalized_plate} 的在场记录",
                        error_code="no_active_record",
                    )
            else:
                return ExitResult(
                    success=False,
                    message="请提供车牌号或停车记录ID",
                    error_code="missing_identifier",
                )

            # 2. 检查是否已出场
            if record.exit_time:
                return ExitResult(
                    success=False,
                    message=f"车辆 {record.vehicle.license_plate} 已出场",
                    error_code="already_exited",
                )

            # 3. 设置出场时间并计算费用
            record.exit_time = timezone.now()
            if operator_id:
                record.operator_id = operator_id
            if auto_pay:
                record.is_paid = True
            record.save()  # save 方法会自动计算费用和时长

            # 4. 释放车位（使用行级锁）
            parking_space = ParkingSpace.objects.select_for_update().get(pk=record.parking_space_id)
            parking_space.is_occupied = False
            parking_space.save(update_fields=["is_occupied", "updated_at"])

            # 清除相关缓存
            from parking.services.dashboard_service import DashboardService

            DashboardService.invalidate_cache()

            logger.info(
                "车辆出场成功: 车牌=%s, 费用=%s, 时长=%s分钟",
                record.vehicle.license_plate,
                record.fee,
                record.duration_minutes,
            )

            return ExitResult(
                success=True,
                record=record,
                fee=record.fee or Decimal("0.00"),
                duration_minutes=record.duration_minutes or 0,
                message=f"出场成功，停车费用: ¥{record.fee}",
            )

        except DatabaseError as e:
            logger.error("车辆出场数据库错误: %s", str(e))
            return ExitResult(
                success=False, message="系统繁忙，请稍后重试", error_code="database_error"
            )
        except Exception as e:
            logger.exception("车辆出场异常: %s", str(e))
            return ExitResult(
                success=False, message="出场失败，请联系管理员", error_code="unknown_error"
            )

    @staticmethod
    def query_vehicle_status(license_plate: str) -> dict[str, Any]:
        """
        查询车辆停车状态

        Args:
            license_plate: 车牌号

        Returns:
            dict: 车辆状态信息
        """
        normalized_plate = license_plate.upper().strip()

        # 查询在场记录（优化：使用select_related避免N+1查询）
        active_record = (
            ParkingRecord.objects.filter(
                vehicle__license_plate=normalized_plate, exit_time__isnull=True
            )
            .select_related("vehicle", "parking_space", "parking_space__parking_lot")
            .first()
        )

        if active_record:
            # 计算当前费用
            current_fee = active_record.calculate_fee()
            duration = timezone.now() - active_record.entry_time
            duration_minutes = int(duration.total_seconds() / 60)

            result = {
                "found": True,
                "is_parked": True,
                "license_plate": normalized_plate,
                "parking_lot": active_record.parking_space.parking_lot.name,
                "space_number": active_record.parking_space.space_number,
                "entry_time": active_record.entry_time,
                "duration_minutes": duration_minutes,
                "current_fee": current_fee,
                "record_id": active_record.id,
            }
            # 添加楼层和区域信息（如果存在）
            if active_record.parking_space.floor:
                result["floor"] = active_record.parking_space.floor
            if active_record.parking_space.area:
                result["area"] = active_record.parking_space.area
            return result

        # 查询车辆是否存在
        vehicle = VehicleService.get_vehicle_by_plate(normalized_plate)
        if vehicle:
            # 获取最近的停车记录（优化：使用select_related）
            last_record = (
                ParkingRecord.objects.filter(vehicle=vehicle)
                .select_related("parking_space", "parking_space__parking_lot")
                .order_by("-exit_time")
                .first()
            )

            return {
                "found": True,
                "is_parked": False,
                "license_plate": normalized_plate,
                "vehicle_type": vehicle.get_vehicle_type_display(),
                "last_visit": last_record.exit_time if last_record else None,
                "last_lot": last_record.parking_space.parking_lot.name if last_record else None,
            }

        return {
            "found": False,
            "is_parked": False,
            "license_plate": normalized_plate,
            "message": "未找到该车辆信息",
        }

    @staticmethod
    def search_records(
        license_plate: str | None = None,
        parking_lot_id: int | None = None,
        status: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> QueryResult:
        """
        搜索停车记录

        支持多条件组合查询，优化查询性能。

        Args:
            license_plate: 车牌号（支持模糊搜索）
            parking_lot_id: 停车场ID
            status: 状态筛选（active/exited/unpaid/paid）
            date_from: 开始日期
            date_to: 结束日期
            limit: 返回数量限制
            offset: 偏移量

        Returns:
            QueryResult: 查询结果
        """
        queryset = ParkingRecord.objects.select_related(
            "vehicle", "parking_space__parking_lot", "operator"
        )

        # 车牌号筛选
        if license_plate:
            queryset = queryset.filter(
                vehicle__license_plate__icontains=license_plate.upper().strip()
            )

        # 停车场筛选
        if parking_lot_id:
            queryset = queryset.filter(parking_space__parking_lot_id=parking_lot_id)

        # 状态筛选
        if status == "active":
            queryset = queryset.filter(exit_time__isnull=True)
        elif status == "exited":
            queryset = queryset.filter(exit_time__isnull=False)
        elif status == "unpaid":
            queryset = queryset.filter(exit_time__isnull=False, is_paid=False)
        elif status == "paid":
            queryset = queryset.filter(is_paid=True)

        # 日期筛选
        if date_from:
            queryset = queryset.filter(entry_time__gte=date_from)
        if date_to:
            # 包含结束日期当天
            date_to_end = date_to + timedelta(days=1)
            queryset = queryset.filter(entry_time__lt=date_to_end)

        # 排序和分页
        queryset = queryset.order_by("-entry_time")
        total = queryset.count()
        records = list(queryset[offset : offset + limit])

        return QueryResult(records=records, total_count=total, has_more=(offset + limit) < total)

    @staticmethod
    @transaction.atomic
    def create_entry_record(
        vehicle: Vehicle, parking_space: ParkingSpace, operator_id: int | None = None
    ) -> ParkingRecord:
        """
        创建入场记录（底层方法）

        Args:
            vehicle: 车辆对象
            parking_space: 停车位对象
            operator_id: 操作员ID

        Returns:
            ParkingRecord: 停车记录对象

        Raises:
            ValueError: 车位已被占用时抛出
        """
        # 使用行级锁检查车位状态
        space = ParkingSpace.objects.select_for_update().get(pk=parking_space.pk)

        if space.is_occupied:
            raise ValueError(f"车位 {space.space_number} 已被占用")

        # 标记车位为已占用
        space.is_occupied = True
        space.save(update_fields=["is_occupied", "updated_at"])

        # 创建停车记录
        record = ParkingRecord.objects.create(
            vehicle=vehicle, parking_space=space, entry_time=timezone.now(), operator_id=operator_id
        )

        # 清除相关缓存
        from parking.services.dashboard_service import DashboardService

        DashboardService.invalidate_cache()

        logger.info("车辆 %s 入场，车位: %s", vehicle.license_plate, space.space_number)
        return record

    @staticmethod
    @transaction.atomic
    def create_exit_record(record: ParkingRecord, operator_id: int | None = None) -> ParkingRecord:
        """
        处理出场记录（底层方法）

        Args:
            record: 停车记录对象
            operator_id: 操作员ID

        Returns:
            ParkingRecord: 更新后的停车记录

        Raises:
            ValueError: 记录已有出场时间时抛出
        """
        # 使用行级锁获取记录
        locked_record = ParkingRecord.objects.select_for_update().get(pk=record.pk)

        if locked_record.exit_time:
            raise ValueError("该停车记录已出场")

        # 设置出场时间
        locked_record.exit_time = timezone.now()
        if operator_id:
            locked_record.operator_id = operator_id
        locked_record.save()  # save方法会自动计算费用和时长

        # 释放车位
        parking_space = ParkingSpace.objects.select_for_update().get(
            pk=locked_record.parking_space_id
        )
        parking_space.is_occupied = False
        parking_space.save(update_fields=["is_occupied", "updated_at"])

        # 清除相关缓存
        from parking.services.dashboard_service import DashboardService

        DashboardService.invalidate_cache()

        logger.info(
            "车辆 %s 出场，费用: %s元，时长: %s分钟",
            locked_record.vehicle.license_plate,
            locked_record.fee,
            locked_record.duration_minutes,
        )
        return locked_record

    @staticmethod
    def get_active_records() -> QuerySet[ParkingRecord]:
        """
        获取所有在场车辆记录

        Returns:
            QuerySet[ParkingRecord]: 在场车辆查询集
        """
        return ParkingRecord.objects.filter(exit_time__isnull=True).select_related(
            "vehicle", "parking_space__parking_lot"
        )

    @staticmethod
    def get_today_statistics() -> dict[str, Any]:
        """
        获取今日统计数据（优化：使用aggregate合并查询）

        Returns:
            dict[str, Any]: 统计数据字典
        """
        from django.db.models import Count, Q

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_records = ParkingRecord.objects.filter(entry_time__gte=today_start)

        # 优化：使用aggregate合并统计查询，减少数据库访问
        stats = today_records.aggregate(
            total_count=Count("id"), revenue=Sum("fee", filter=Q(is_paid=True))
        )

        return {"count": stats["total_count"] or 0, "revenue": stats["revenue"] or Decimal("0.00")}

    @staticmethod
    def get_recent_records(limit: int = 10) -> QuerySet[ParkingRecord]:
        """
        获取最近的停车记录

        Args:
            limit: 返回记录数量限制

        Returns:
            QuerySet[ParkingRecord]: 停车记录查询集
        """
        return (
            ParkingRecord.objects.select_related("vehicle", "parking_space__parking_lot")
            .only(
                "id",
                "vehicle__license_plate",
                "parking_space__space_number",
                "parking_space__parking_lot__name",
                "entry_time",
                "exit_time",
                "fee",
                "is_paid",
            )
            .order_by("-entry_time")[:limit]
        )
