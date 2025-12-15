"""
停车场服务异常类

从 parking.services 迁移
"""


class ServiceError(Exception):
    """服务层异常基类"""

    def __init__(self, message: str, code: str = "service_error"):
        self.message = message
        self.code = code
        super().__init__(message)


class VehicleAlreadyParkedError(ServiceError):
    """车辆已在场内异常"""

    def __init__(self, license_plate: str, lot_name: str):
        super().__init__(
            f"车辆 {license_plate} 已在 {lot_name} 停车", code="vehicle_already_parked"
        )
        self.license_plate = license_plate
        self.lot_name = lot_name


class NoAvailableSpaceError(ServiceError):
    """无可用车位异常"""

    def __init__(self, lot_name: str):
        super().__init__(f"停车场 {lot_name} 已无可用车位", code="no_available_space")
        self.lot_name = lot_name


class RecordNotFoundError(ServiceError):
    """停车记录不存在异常"""

    def __init__(self, identifier: str):
        super().__init__(f"停车记录不存在: {identifier}", code="record_not_found")


class RecordAlreadyExitedError(ServiceError):
    """车辆已出场异常"""

    def __init__(self, license_plate: str):
        super().__init__(f"车辆 {license_plate} 已出场", code="already_exited")
