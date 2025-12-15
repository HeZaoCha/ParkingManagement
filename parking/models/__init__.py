"""
停车场管理系统数据模型

从 parking.models 迁移
"""

# 导入所有模型和验证器
from parking.models.parking_lot import ParkingLot
from parking.models.parking_space import ParkingSpace
from parking.models.vehicle import Vehicle, VIPVehicle
from parking.models.parking_record import ParkingRecord
from parking.models.validators import (
    validate_license_plate,
    license_plate_validator,
    PROVINCE_ABBREVIATIONS,
    CITY_CODES,
    LICENSE_PLATE_PATTERN,
)

__all__ = [
    "ParkingLot",
    "ParkingSpace",
    "Vehicle",
    "VIPVehicle",
    "ParkingRecord",
    "validate_license_plate",
    "license_plate_validator",
    "PROVINCE_ABBREVIATIONS",
    "CITY_CODES",
    "LICENSE_PLATE_PATTERN",
]
