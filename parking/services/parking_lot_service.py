"""
停车场服务

从 parking.services 迁移
"""

from django.core.cache import cache
from django.db.models import Count, Q, QuerySet

from parking.models.parking_lot import ParkingLot

# 缓存键前缀和TTL
CACHE_KEY_PREFIX = "parking:"
CACHE_TTL_SHORT = 60  # 1分钟


class ParkingLotService:
    """
    停车场服务类

    提供停车场相关的业务操作。
    """

    @staticmethod
    def get_active_lots() -> QuerySet[ParkingLot]:
        """
        获取所有活跃的停车场（带车位统计）

        Returns:
            QuerySet[ParkingLot]: 活跃停车场查询集，包含 occupied_count 注解

        Note:
            使用 occupied_count 而非 occupied_spaces 避免与模型 property 冲突
            注意：QuerySet 不能直接缓存，但查询结果可以缓存
        """
        return (
            ParkingLot.objects.filter(is_active=True)
            .annotate(
                occupied_count=Count("parking_spaces", filter=Q(parking_spaces__is_occupied=True))
            )
            .only("id", "name", "address", "total_spaces", "hourly_rate")
        )

    @staticmethod
    def get_active_lots_with_availability() -> list[dict]:
        """
        获取所有活跃停车场及其可用车位信息

        Returns:
            list[dict]: 停车场列表，每项包含可用车位数
        """
        lots = ParkingLotService.get_active_lots()
        # 使用列表推导式优化性能（Python 3.13推荐）
        return [
            {
                "id": lot.id,
                "name": lot.name,
                "address": lot.address,
                "total_spaces": lot.total_spaces,
                "occupied_spaces": lot.occupied_count,
                "available_spaces": max(0, lot.total_spaces - lot.occupied_count),
                "hourly_rate": lot.hourly_rate,
            }
            for lot in lots
        ]

    @staticmethod
    def get_lot_by_id(lot_id: int) -> ParkingLot | None:
        """
        根据ID获取停车场（带缓存优化）

        Args:
            lot_id: 停车场ID

        Returns:
            Optional[ParkingLot]: 停车场对象，不存在则返回None

        Note:
            使用 Django 缓存框架缓存查询结果，减少数据库访问
            注意：缓存时间较短（1分钟），确保状态变更能及时反映
        """
        cache_key = f"{CACHE_KEY_PREFIX}lot:{lot_id}"
        cached_lot = cache.get(cache_key)
        if cached_lot is not None:
            return cached_lot

        try:
            lot = ParkingLot.objects.get(id=lot_id, is_active=True)
            # 缓存1分钟（较短时间，确保状态变更能及时反映）
            cache.set(cache_key, lot, CACHE_TTL_SHORT)
            return lot
        except ParkingLot.DoesNotExist:
            # 不缓存None结果，因为状态可能变化（非活跃可能变为活跃）
            return None
