"""
停车场管理系统自定义模板过滤器

提供常用的模板过滤器，用于数据格式化和计算。
"""

from django import template

register = template.Library()


@register.filter
def mod(value: int, arg: int) -> int:
    """
    取模运算过滤器

    Args:
        value: 被除数
        arg: 除数

    Returns:
        int: 余数

    Example:
        {{ duration|mod:60 }}
    """
    try:
        return int(value) % int(arg)
    except (ValueError, TypeError, ZeroDivisionError):
        return 0


@register.filter
def div(value: int, arg: int) -> int:
    """
    整除运算过滤器

    Args:
        value: 被除数
        arg: 除数

    Returns:
        int: 商（整数部分）

    Example:
        {{ duration|div:60 }}
    """
    try:
        return int(value) // int(arg)
    except (ValueError, TypeError, ZeroDivisionError):
        return 0


@register.filter
def duration_format(minutes: int) -> str:
    """
    时长格式化过滤器

    将分钟数转换为可读的时长格式。

    Args:
        minutes: 分钟数

    Returns:
        str: 格式化后的时长字符串

    Example:
        {{ record.duration_minutes|duration_format }}
        输出: "2小时30分钟" 或 "45分钟"
    """
    try:
        minutes = int(minutes)
        if minutes < 0:
            return "-"

        hours = minutes // 60
        mins = minutes % 60

        if hours > 0 and mins > 0:
            return f"{hours}小时{mins}分钟"
        elif hours > 0:
            return f"{hours}小时"
        else:
            return f"{mins}分钟"
    except (ValueError, TypeError):
        return "-"


@register.filter
def percentage(value: int, total: int) -> int:
    """
    计算百分比过滤器

    Args:
        value: 分子
        total: 分母

    Returns:
        int: 百分比值（0-100）

    Example:
        {{ occupied|percentage:total }}
    """
    try:
        if total == 0:
            return 0
        return int((value / total) * 100)
    except (ValueError, TypeError, ZeroDivisionError):
        return 0


@register.filter
def currency(value) -> str:
    """
    货币格式化过滤器

    Args:
        value: 金额数值

    Returns:
        str: 格式化后的货币字符串

    Example:
        {{ record.fee|currency }}
        输出: "¥123.45"
    """
    try:
        return f"¥{float(value):,.2f}"
    except (ValueError, TypeError):
        return "¥0.00"
