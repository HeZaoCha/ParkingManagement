"""
停车场管理业务服务层

从 parking.services 迁移
"""

# 导入所有服务和异常
from parking.services.exceptions import (
    ServiceError,
    VehicleAlreadyParkedError,
    NoAvailableSpaceError,
    RecordNotFoundError,
    RecordAlreadyExitedError,
)
from parking.services.data_classes import (
    EntryResult,
    ExitResult,
    QueryResult,
)
from parking.services.parking_lot_service import ParkingLotService
from parking.services.parking_space_service import ParkingSpaceService
from parking.services.vehicle_service import VehicleService
from parking.services.parking_record_service import ParkingRecordService
from parking.services.dashboard_service import DashboardService

__all__ = [
    # 异常类
    'ServiceError',
    'VehicleAlreadyParkedError',
    'NoAvailableSpaceError',
    'RecordNotFoundError',
    'RecordAlreadyExitedError',
    # 数据类
    'EntryResult',
    'ExitResult',
    'QueryResult',
    # 服务类
    'ParkingLotService',
    'ParkingSpaceService',
    'VehicleService',
    'ParkingRecordService',
    'DashboardService',
]
