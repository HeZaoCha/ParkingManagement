"""
车辆服务

从 parking.services 迁移
"""

from django.db.models import Q

from parking.models.parking_record import ParkingRecord
from parking.models.vehicle import Vehicle
from parking.services.data_classes import QueryResult


class VehicleService:
    """
    车辆服务类

    提供车辆相关的业务操作。
    """

    @staticmethod
    def get_or_create_vehicle(
        license_plate: str, vehicle_type: str = "car", owner_name: str = "", owner_phone: str = ""
    ) -> Vehicle:
        """
        获取或创建车辆

        Args:
            license_plate: 车牌号
            vehicle_type: 车辆类型
            owner_name: 车主姓名
            owner_phone: 车主电话

        Returns:
            Vehicle: 车辆对象
        """
        license_plate = license_plate.upper().strip()

        vehicle, created = Vehicle.objects.get_or_create(
            license_plate=license_plate,
            defaults={
                "vehicle_type": vehicle_type,
                "owner_name": owner_name,
                "owner_phone": owner_phone,
            },
        )

        # 如果车辆已存在，更新信息（如果提供了新信息）
        # 注意：不更新vehicle_type，因为这是车辆的基本属性
        if not created:
            updated = False
            if owner_name and vehicle.owner_name != owner_name:
                vehicle.owner_name = owner_name
                updated = True
            if owner_phone and vehicle.owner_phone != owner_phone:
                vehicle.owner_phone = owner_phone
                updated = True

            if updated:
                vehicle.save()

        return vehicle

    @staticmethod
    def get_vehicle_by_plate(license_plate: str) -> Vehicle | None:
        """
        根据车牌号获取车辆

        Args:
            license_plate: 车牌号

        Returns:
            Optional[Vehicle]: 车辆对象，不存在则返回None
        """
        try:
            return Vehicle.objects.get(license_plate=license_plate.upper().strip())
        except Vehicle.DoesNotExist:
            return None

    @staticmethod
    def is_vehicle_parked(license_plate: str) -> tuple[bool, ParkingRecord | None]:
        """
        检查车辆是否正在停车

        Args:
            license_plate: 车牌号

        Returns:
            tuple: (是否停车, 停车记录)
        """
        try:
            record = (
                ParkingRecord.objects.filter(
                    vehicle__license_plate=license_plate.upper().strip(), exit_time__isnull=True
                )
                .select_related("vehicle", "parking_space", "parking_space__parking_lot")
                .first()
            )

            return (record is not None, record)
        except Exception:
            return (False, None)

    @staticmethod
    def search_vehicles(
        keyword: str | None = None,
        vehicle_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> QueryResult:
        """
        搜索车辆

        支持按车牌号、车主姓名、电话模糊搜索。

        Args:
            keyword: 搜索关键词
            vehicle_type: 车辆类型筛选
            limit: 返回数量限制
            offset: 偏移量

        Returns:
            QueryResult: 查询结果
        """
        queryset = Vehicle.objects.all()

        if keyword:
            keyword = keyword.upper().strip()
            queryset = queryset.filter(
                Q(license_plate__icontains=keyword)
                | Q(owner_name__icontains=keyword)
                | Q(owner_phone__icontains=keyword)
            )

        if vehicle_type:
            queryset = queryset.filter(vehicle_type=vehicle_type)

        total = queryset.count()
        records = list(queryset.order_by("-created_at")[offset : offset + limit])

        return QueryResult(records=records, total_count=total, has_more=(offset + limit) < total)
