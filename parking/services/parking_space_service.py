"""
停车位服务

从 parking.services 迁移
"""

from django.db.models import Count, Q

from parking.models.parking_space import ParkingSpace


class ParkingSpaceService:
    """
    停车位服务类

    提供停车位相关的业务操作。
    """

    @staticmethod
    def get_available_space(lot_id: int) -> ParkingSpace | None:
        """
        获取指定停车场的可用车位

        Args:
            lot_id: 停车场ID

        Returns:
            Optional[ParkingSpace]: 可用车位，如果没有则返回None
        """
        try:
            return (
                ParkingSpace.objects.filter(
                    parking_lot_id=lot_id, is_occupied=False, is_reserved=False
                )
                .select_for_update()
                .first()
            )
        except Exception:
            return None

    @staticmethod
    def get_space_statistics(lot_ids: list[int]) -> dict[str, int]:
        """
        获取多个停车场的车位统计信息（优化：使用aggregate合并查询）

        Args:
            lot_ids: 停车场ID列表

        Returns:
            dict: 统计信息，包含total、occupied、available
        """

        # 优化：使用aggregate合并统计查询，减少数据库访问
        if not lot_ids:
            return {"total": 0, "occupied": 0, "available": 0}

        stats = ParkingSpace.objects.filter(parking_lot_id__in=lot_ids).aggregate(
            total=Count("id"), occupied=Count("id", filter=Q(is_occupied=True))
        )

        total = stats["total"] or 0
        occupied = stats["occupied"] or 0

        return {"total": total, "occupied": occupied, "available": max(0, total - occupied)}
