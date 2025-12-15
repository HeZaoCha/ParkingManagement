"""
全局工具函数

提供项目中常用的工具函数。

从 apps.common.utils 迁移
"""

import hashlib
import re
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Optional

from django.utils import timezone


def format_currency(amount: Decimal, symbol: str = "¥") -> str:
    """
    格式化货币金额

    Args:
        amount: 金额
        symbol: 货币符号，默认为¥

    Returns:
        str: 格式化后的金额字符串
    """
    return f"{symbol}{amount:.2f}"


def format_duration(minutes: int) -> str:
    """
    格式化时长（分钟转换为可读格式）

    Args:
        minutes: 分钟数

    Returns:
        str: 格式化后的时长字符串，如"2小时30分钟"
    """
    if minutes < 60:
        return f"{minutes}分钟"

    hours = minutes // 60
    mins = minutes % 60

    if mins == 0:
        return f"{hours}小时"
    return f"{hours}小时{mins}分钟"


def calculate_hours(start_time: datetime, end_time: Optional[datetime] = None) -> float:
    """
    计算两个时间点之间的小时数

    Args:
        start_time: 开始时间
        end_time: 结束时间，如果为None则使用当前时间

    Returns:
        float: 小时数（保留2位小数）
    """
    if end_time is None:
        end_time = timezone.now()

    if not isinstance(start_time, datetime):
        raise ValueError("start_time必须是datetime对象")
    if not isinstance(end_time, datetime):
        raise ValueError("end_time必须是datetime对象")

    duration = end_time - start_time
    hours = duration.total_seconds() / 3600
    return round(hours, 2)


def validate_license_plate(plate: str) -> bool:
    """
    验证车牌号格式（中国车牌）

    Args:
        plate: 车牌号

    Returns:
        bool: 是否为有效车牌号
    """
    # 中国车牌号格式：省份简称 + 字母 + 5位数字/字母
    pattern = (
        r"^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5}$"
    )
    return bool(re.match(pattern, plate.upper()))


def validate_phone(phone: str) -> bool:
    """
    验证手机号格式（中国手机号）

    Args:
        phone: 手机号

    Returns:
        bool: 是否为有效手机号
    """
    # 中国手机号：11位数字，以1开头
    pattern = r"^1[3-9]\d{9}$"
    return bool(re.match(pattern, phone))


def generate_hash(data: str, algorithm: str = "sha256") -> str:
    """
    生成数据的哈希值

    Args:
        data: 要哈希的数据
        algorithm: 哈希算法，默认为sha256

    Returns:
        str: 哈希值（十六进制字符串）
    """
    hash_obj = hashlib.new(algorithm)
    hash_obj.update(data.encode("utf-8"))
    return hash_obj.hexdigest()


def get_file_size(file_path: Path) -> int:
    """
    获取文件大小（字节）

    Args:
        file_path: 文件路径

    Returns:
        int: 文件大小（字节）
    """
    if not file_path.exists():
        raise FileNotFoundError(f"文件不存在: {file_path}")
    return file_path.stat().st_size


def format_file_size(size_bytes: int) -> str:
    """
    格式化文件大小

    Args:
        size_bytes: 文件大小（字节）

    Returns:
        str: 格式化后的文件大小，如"1.5 MB"
    """
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"


def truncate_string(text: str, max_length: int = 50, suffix: str = "...") -> str:
    """
    截断字符串

    Args:
        text: 要截断的字符串
        max_length: 最大长度
        suffix: 截断后的后缀

    Returns:
        str: 截断后的字符串
    """
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)] + suffix


def get_today_start() -> datetime:
    """
    获取今天的开始时间（00:00:00）

    Returns:
        datetime: 今天的开始时间
    """
    now = timezone.now()
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def get_today_end() -> datetime:
    """
    获取今天的结束时间（23:59:59）

    Returns:
        datetime: 今天的结束时间
    """
    now = timezone.now()
    return now.replace(hour=23, minute=59, second=59, microsecond=999999)


def get_date_range(days: int = 7) -> tuple[datetime, datetime]:
    """
    获取日期范围

    Args:
        days: 天数，默认为7天

    Returns:
        tuple: (开始时间, 结束时间)
    """
    end_time = timezone.now()
    start_time = end_time - timedelta(days=days)
    return start_time, end_time
