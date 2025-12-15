"""
车牌号验证器

从 parking.models 迁移
"""

import re

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator


# 中国省份简称列表
PROVINCE_ABBREVIATIONS = (
    "京",
    "津",
    "沪",
    "渝",  # 直辖市
    "冀",
    "豫",
    "云",
    "辽",
    "黑",
    "湘",
    "皖",
    "鲁",  # 省份
    "新",
    "苏",
    "浙",
    "赣",
    "鄂",
    "桂",
    "甘",
    "晋",
    "蒙",
    "陕",
    "吉",
    "闽",
    "贵",
    "粤",
    "青",
    "藏",
    "川",
    "宁",
    "琼",
    "使",
    "领",  # 使领馆车牌
)

# 地级市代号（A-Z，不含I、O）
CITY_CODES = "ABCDEFGHJKLMNPQRSTUVWXYZ"

# 中国车牌号正则表达式（GA 36-2018标准）
# 普通车牌：省+市+5位字母数字
# 新能源车牌：省+市+6位（小型车D/F开头，大型车D/F开头）
LICENSE_PLATE_PATTERN = re.compile(
    r"^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领]"
    r"[A-HJ-NP-Z]"  # 地级市代号，不含I、O
    r"(?:"
    r"[A-HJ-NP-Z0-9]{5}"  # 普通车牌：5位
    r"|"
    r"[DF][A-HJ-NP-Z0-9]{5}"  # 新能源小型车：D/F开头+5位
    r"|"
    r"[A-HJ-NP-Z0-9]{4}[DF]"  # 新能源大型车：4位+D/F
    r")"
    r"[挂学警港澳]?$"  # 可选的特殊后缀
)


def validate_license_plate(value: str) -> None:
    """
    验证中国车牌号格式（GA 36-2018标准）

    规则：
    1. 第1位：省份简称
    2. 第2位：地级市代号（A-Z，不含I、O）
    3. 第3-7/8位：序号（普通5位，新能源6位）
    4. 可选后缀：挂、学、警、港、澳

    Args:
        value: 车牌号字符串

    Raises:
        ValidationError: 车牌号格式不正确时抛出
    """
    if not value:
        raise ValidationError("车牌号不能为空", code="empty_plate")

    # 规范化：转为大写，去除空格
    normalized = value.upper().strip()

    # 长度检查：普通7位，新能源8位，特殊最多9位
    if len(normalized) < 7 or len(normalized) > 9:
        raise ValidationError(f"车牌号长度不正确: {normalized}（应为7-8位）", code="invalid_length")

    # 省份检查
    if normalized[0] not in PROVINCE_ABBREVIATIONS:
        raise ValidationError(f"无效的省份简称: {normalized[0]}", code="invalid_province")

    # 地级市代号检查（不含I、O）
    if normalized[1] not in CITY_CODES:
        raise ValidationError(
            f"无效的地级市代号: {normalized[1]}（不能使用I和O）", code="invalid_city_code"
        )

    # 完整格式检查
    if not LICENSE_PLATE_PATTERN.match(normalized):
        raise ValidationError(
            f"车牌号格式不正确: {normalized}，请输入有效的中国车牌号", code="invalid_format"
        )


# 车牌号验证器实例
license_plate_validator = RegexValidator(
    regex=LICENSE_PLATE_PATTERN,
    message="请输入有效的中国车牌号码（如：粤E9KM03）",
    code="invalid_license_plate",
)
