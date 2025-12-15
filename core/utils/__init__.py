"""
全局工具函数

从 apps.common.utils 迁移
"""

# 向后兼容：重新导出所有函数
from .utils import (
    format_currency,
    format_duration,
    calculate_hours,
    validate_license_plate,
    validate_phone,
    generate_hash,
    get_file_size,
    format_file_size,
    truncate_string,
    get_today_start,
    get_today_end,
    get_date_range,
)

__all__ = [
    "format_currency",
    "format_duration",
    "calculate_hours",
    "validate_license_plate",
    "validate_phone",
    "generate_hash",
    "get_file_size",
    "format_file_size",
    "truncate_string",
    "get_today_start",
    "get_today_end",
    "get_date_range",
]
