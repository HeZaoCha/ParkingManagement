"""
自定义异常类

定义项目中使用的自定义异常。
"""

from typing import Optional


class ParkingManagementException(Exception):
    """停车场管理系统基础异常类"""

    pass


class BusinessLogicError(ParkingManagementException):
    """业务逻辑错误"""

    def __init__(self, message: str, code: Optional[str] = None) -> None:
        """
        初始化业务逻辑错误

        Args:
            message: 错误消息
            code: 错误代码
        """
        super().__init__(message)
        self.message = message
        self.code = code


class ValidationError(ParkingManagementException):
    """数据验证错误"""

    def __init__(self, message: str, field: Optional[str] = None) -> None:
        """
        初始化验证错误

        Args:
            message: 错误消息
            field: 出错的字段名
        """
        super().__init__(message)
        self.message = message
        self.field = field


class NotFoundError(ParkingManagementException):
    """资源未找到错误"""

    def __init__(self, resource: str, identifier: Optional[str] = None) -> None:
        """
        初始化未找到错误

        Args:
            resource: 资源类型
            identifier: 资源标识符
        """
        message = f"{resource}未找到"
        if identifier:
            message += f": {identifier}"
        super().__init__(message)
        self.resource = resource
        self.identifier = identifier


class PermissionDeniedError(ParkingManagementException):
    """权限不足错误"""

    def __init__(self, message: str = "您没有执行此操作的权限") -> None:
        """
        初始化权限错误

        Args:
            message: 错误消息
        """
        super().__init__(message)
        self.message = message
