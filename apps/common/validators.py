"""
自定义验证器

提供Django模型字段的自定义验证器。
"""

import re

from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible


@deconstructible
class LicensePlateValidator:
    """
    车牌号验证器

    验证中国车牌号格式。
    """

    message = "请输入有效的车牌号格式"
    code = "invalid_license_plate"

    def __init__(self, message: str | None = None) -> None:
        """
        初始化验证器

        Args:
            message: 自定义错误消息
        """
        if message is not None:
            self.message = message

    def __call__(self, value: str) -> None:
        """
        验证车牌号

        Args:
            value: 车牌号字符串

        Raises:
            ValidationError: 如果车牌号格式无效
        """
        if not value:
            return

        # 中国车牌号格式：省份简称 + 字母 + 5位数字/字母
        pattern = r"^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5}$"
        if not re.match(pattern, value.upper()):
            raise ValidationError(self.message, code=self.code)


@deconstructible
class PhoneValidator:
    """
    手机号验证器

    验证中国手机号格式。
    """

    message = "请输入有效的手机号格式（11位数字，以1开头）"
    code = "invalid_phone"

    def __init__(self, message: str | None = None) -> None:
        """
        初始化验证器

        Args:
            message: 自定义错误消息
        """
        if message is not None:
            self.message = message

    def __call__(self, value: str) -> None:
        """
        验证手机号

        Args:
            value: 手机号字符串

        Raises:
            ValidationError: 如果手机号格式无效
        """
        if not value:
            return

        # 中国手机号：11位数字，以1开头
        pattern = r"^1[3-9]\d{9}$"
        if not re.match(pattern, value):
            raise ValidationError(self.message, code=self.code)
