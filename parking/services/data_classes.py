"""
停车场服务数据类

从 parking.services 迁移
"""
from dataclasses import dataclass
from decimal import Decimal

from parking.models.parking_record import ParkingRecord


@dataclass
class EntryResult:
    """入场操作结果"""
    success: bool
    record: ParkingRecord | None = None
    space_number: str = ''
    lot_name: str = ''
    message: str = ''
    error_code: str = ''


@dataclass
class ExitResult:
    """出场操作结果"""
    success: bool
    record: ParkingRecord | None = None
    fee: Decimal = Decimal('0.00')
    duration_minutes: int = 0
    message: str = ''
    error_code: str = ''


@dataclass
class QueryResult:
    """查询操作结果"""
    records: list[ParkingRecord]
    total_count: int
    has_more: bool = False
