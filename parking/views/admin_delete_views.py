"""
管理后台删除视图（使用基类）

使用 BaseDeleteView 基类实现的删除视图，减少重复代码。
"""

from parking.models import ParkingLot, ParkingSpace, Vehicle
from parking.views.base import BaseDeleteView


class ParkingLotDeleteView(BaseDeleteView):
    """停车场删除视图"""

    model = ParkingLot
    check_relations = []
    success_message = '停车场 "{name}" 已删除'

    @classmethod
    def check_custom_relations(cls, request, obj):
        """检查停车场是否有关联的车位"""
        from parking.models import ParkingSpace

        if ParkingSpace.objects.filter(parking_lot=obj).exists():
            from django.http import JsonResponse

            return JsonResponse(
                {"success": False, "message": "该停车场下存在车位，无法删除。请先删除所有车位。"}
            )
        return None


class ParkingSpaceDeleteView(BaseDeleteView):
    """车位删除视图"""

    model = ParkingSpace
    check_relations = []
    success_message = '车位 "{name}" 已删除'

    @classmethod
    def check_custom_relations(cls, request, obj):
        """检查车位是否被占用"""
        from django.http import JsonResponse

        if obj.is_occupied:
            return JsonResponse({"success": False, "message": "该车位当前被占用，无法删除"})
        return None


class VehicleDeleteView(BaseDeleteView):
    """车辆删除视图"""

    model = Vehicle
    check_relations = []
    success_message = '车辆 "{name}" 已删除'

    @classmethod
    def check_custom_relations(cls, request, obj):
        """检查车辆是否有未完成的停车记录"""
        from parking.models import ParkingRecord
        from django.http import JsonResponse

        if ParkingRecord.objects.filter(vehicle=obj, exit_time__isnull=True).exists():
            return JsonResponse({"success": False, "message": "该车辆当前正在停车中，无法删除"})
        return None


# 创建视图函数
parking_lot_delete = ParkingLotDeleteView.as_view()
parking_space_delete = ParkingSpaceDeleteView.as_view()
vehicle_delete = VehicleDeleteView.as_view()
