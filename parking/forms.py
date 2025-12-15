"""
停车场管理系统表单模块

提供车辆入场、出场、查询等操作的数据验证。
使用 Django Forms 进行安全的数据验证，防止 SQL 注入和无效数据。

Author: HeZaoCha
Created: 2024-12-09
Last Modified: 2025-12-11
Version: 1.1.0
"""

import re
from typing import Optional

from django import forms
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

from parking.models import ParkingLot, ParkingSpace, Vehicle


# 车牌号正则验证器
LICENSE_PLATE_REGEX = re.compile(
    r"^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领]"
    r"[A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$"
)

license_plate_validator = RegexValidator(
    regex=LICENSE_PLATE_REGEX, message="请输入有效的中国车牌号码", code="invalid_license_plate"
)


class LicensePlateField(forms.CharField):
    """
    车牌号字段

    自动进行大写转换和格式验证。
    """

    default_validators = [license_plate_validator]

    def __init__(self, **kwargs):
        kwargs.setdefault("max_length", 10)
        kwargs.setdefault("min_length", 7)
        super().__init__(**kwargs)

    def clean(self, value: Optional[str]) -> str:
        """清理并验证车牌号"""
        value = super().clean(value)
        if value:
            # 转换为大写并去除空格
            value = value.upper().strip().replace(" ", "")
        return value


class VehicleEntryForm(forms.Form):
    """
    车辆入场表单

    验证入场所需的车牌号和停车场信息。
    """

    license_plate = LicensePlateField(
        label="车牌号",
        help_text="请输入有效的中国车牌号码",
        error_messages={
            "required": "车牌号不能为空",
            "min_length": "车牌号长度不正确",
            "max_length": "车牌号长度不正确",
        },
    )

    parking_lot_id = forms.IntegerField(
        label="停车场",
        min_value=1,
        error_messages={
            "required": "请选择停车场",
            "min_value": "无效的停车场",
            "invalid": "无效的停车场ID",
        },
    )

    vehicle_type = forms.ChoiceField(
        label="车辆类型",
        choices=Vehicle.VEHICLE_TYPE_CHOICES,
        initial="car",
        required=False,
    )

    def clean_parking_lot_id(self) -> int:
        """验证停车场是否存在且可用"""
        lot_id = self.cleaned_data["parking_lot_id"]

        try:
            lot = ParkingLot.objects.get(pk=lot_id)
        except ParkingLot.DoesNotExist:
            raise ValidationError("停车场不存在", code="lot_not_found")

        if not lot.is_active:
            raise ValidationError("该停车场已停止运营", code="lot_inactive")

        # 检查是否有可用车位
        available = ParkingSpace.objects.filter(
            parking_lot_id=lot_id, is_occupied=False, is_reserved=False
        ).exists()

        if not available:
            raise ValidationError("该停车场已无可用车位", code="no_available_space")

        return lot_id

    def clean_license_plate(self) -> str:
        """验证车牌号是否已在场内"""
        plate = self.cleaned_data["license_plate"]

        # 检查是否已经有未出场的记录
        from parking.models import ParkingRecord

        active_record = (
            ParkingRecord.objects.filter(vehicle__license_plate=plate, exit_time__isnull=True)
            .select_related("parking_space__parking_lot")
            .first()
        )

        if active_record:
            lot_name = active_record.parking_space.parking_lot.name
            raise ValidationError(
                f"该车辆已在 {lot_name} 停车，请先办理出场", code="vehicle_already_parked"
            )

        return plate


class VehicleExitForm(forms.Form):
    """
    车辆出场表单

    验证出场所需的车牌号或记录ID。
    """

    license_plate = LicensePlateField(
        label="车牌号",
        required=False,
    )

    record_id = forms.IntegerField(
        label="停车记录ID",
        min_value=1,
        required=False,
    )

    def clean(self) -> dict:
        """验证至少提供一个标识"""
        cleaned_data = super().clean()
        plate = cleaned_data.get("license_plate")
        record_id = cleaned_data.get("record_id")

        if not plate and not record_id:
            raise ValidationError("请提供车牌号或停车记录ID", code="missing_identifier")

        return cleaned_data

    def get_parking_record(self):
        """
        获取对应的停车记录

        Returns:
            ParkingRecord: 停车记录对象

        Raises:
            ValidationError: 找不到记录或记录已出场时抛出
        """
        from parking.models import ParkingRecord

        record_id = self.cleaned_data.get("record_id")
        plate = self.cleaned_data.get("license_plate")

        if record_id:
            try:
                record = ParkingRecord.objects.select_related(
                    "vehicle", "parking_space__parking_lot"
                ).get(pk=record_id)
            except ParkingRecord.DoesNotExist:
                raise ValidationError("停车记录不存在", code="record_not_found")
        else:
            record = (
                ParkingRecord.objects.filter(vehicle__license_plate=plate, exit_time__isnull=True)
                .select_related("vehicle", "parking_space__parking_lot")
                .first()
            )

            if not record:
                raise ValidationError(f"未找到车牌 {plate} 的在场记录", code="no_active_record")

        if record.exit_time:
            raise ValidationError("该车辆已出场", code="already_exited")

        return record


class VehicleQueryForm(forms.Form):
    """
    车辆查询表单

    支持按车牌号、停车场等条件查询。
    """

    license_plate = forms.CharField(
        label="车牌号",
        max_length=10,
        required=False,
        help_text="支持模糊搜索",
    )

    parking_lot_id = forms.IntegerField(
        label="停车场",
        min_value=1,
        required=False,
    )

    status = forms.ChoiceField(
        label="状态",
        choices=[
            ("", "全部"),
            ("active", "在场"),
            ("exited", "已出场"),
            ("unpaid", "未支付"),
        ],
        required=False,
    )

    date_from = forms.DateField(
        label="开始日期",
        required=False,
        widget=forms.DateInput(attrs={"type": "date"}),
    )

    date_to = forms.DateField(
        label="结束日期",
        required=False,
        widget=forms.DateInput(attrs={"type": "date"}),
    )

    def clean_license_plate(self) -> Optional[str]:
        """清理车牌号查询条件"""
        plate = self.cleaned_data.get("license_plate", "").strip()
        if plate:
            # 防止 SQL 注入：只允许合法字符
            if not re.match(r"^[A-Z0-9\u4e00-\u9fa5]{1,10}$", plate.upper()):
                raise ValidationError("车牌号格式不正确")
            return plate.upper()
        return None

    def clean(self) -> dict:
        """验证日期范围"""
        cleaned_data = super().clean()
        date_from = cleaned_data.get("date_from")
        date_to = cleaned_data.get("date_to")

        if date_from and date_to and date_from > date_to:
            raise ValidationError("开始日期不能晚于结束日期", code="invalid_date_range")

        return cleaned_data


class ParkingLotForm(forms.ModelForm):
    """
    停车场表单

    用于创建和编辑停车场。
    """

    class Meta:
        model = ParkingLot
        fields = ["name", "address", "total_spaces", "hourly_rate", "is_active"]
        widgets = {
            "name": forms.TextInput(
                attrs={
                    "class": "form-input",
                    "placeholder": "请输入停车场名称",
                }
            ),
            "address": forms.TextInput(
                attrs={
                    "class": "form-input",
                    "placeholder": "请输入详细地址",
                }
            ),
            "total_spaces": forms.NumberInput(
                attrs={
                    "class": "form-input",
                    "min": "0",
                }
            ),
            "hourly_rate": forms.NumberInput(
                attrs={
                    "class": "form-input",
                    "min": "0.01",
                    "step": "0.01",
                }
            ),
        }

    def clean_name(self) -> str:
        """验证停车场名称唯一性"""
        name = self.cleaned_data["name"].strip()

        qs = ParkingLot.objects.filter(name=name)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise ValidationError("该停车场名称已存在", code="name_exists")

        return name


class VehicleForm(forms.ModelForm):
    """
    车辆信息表单

    用于创建和编辑车辆信息。
    """

    license_plate = LicensePlateField(label="车牌号")

    class Meta:
        model = Vehicle
        fields = ["license_plate", "vehicle_type", "owner_name", "owner_phone"]
        widgets = {
            "owner_name": forms.TextInput(
                attrs={
                    "class": "form-input",
                    "placeholder": "车主姓名（选填）",
                }
            ),
            "owner_phone": forms.TextInput(
                attrs={
                    "class": "form-input",
                    "placeholder": "联系电话（选填）",
                }
            ),
        }

    def clean_license_plate(self) -> str:
        """验证车牌号唯一性"""
        plate = self.cleaned_data["license_plate"]

        qs = Vehicle.objects.filter(license_plate=plate)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise ValidationError("该车牌号已登记", code="plate_exists")

        return plate


# 手机号正则验证器
PHONE_REGEX = re.compile(r"^1[3-9]\d{9}$")
phone_validator = RegexValidator(
    regex=PHONE_REGEX, message="请输入有效的11位手机号码", code="invalid_phone"
)


class RegisterForm(forms.Form):
    """用户注册表单"""

    username = forms.CharField(
        label="用户名",
        max_length=20,
        min_length=3,
        help_text="3-20个字符，支持所有字符类型（中文、英文、数字、特殊字符等）",
        widget=forms.TextInput(
            attrs={
                "class": "form-input",
                "placeholder": "请输入用户名",
            }
        ),
    )

    email = forms.EmailField(
        label="邮箱",
        required=False,
        widget=forms.EmailInput(
            attrs={
                "class": "form-input",
                "placeholder": "请输入邮箱地址",
            }
        ),
    )

    phone = forms.CharField(
        label="手机号",
        max_length=11,
        required=False,
        validators=[phone_validator],
        widget=forms.TextInput(
            attrs={
                "class": "form-input",
                "placeholder": "请输入11位手机号",
            }
        ),
    )

    password = forms.CharField(
        label="密码",
        min_length=8,
        max_length=128,  # NIST建议最大长度至少64字符，这里设置为128以支持更长的passphrase
        widget=forms.PasswordInput(
            attrs={
                "class": "form-input",
                "placeholder": "至少8个字符，建议使用passphrase",
            }
        ),
        help_text="密码至少8个字符，建议使用passphrase（多个单词组合）以提高安全性",
    )

    password_confirm = forms.CharField(
        label="确认密码",
        widget=forms.PasswordInput(
            attrs={
                "class": "form-input",
                "placeholder": "请再次输入密码",
            }
        ),
    )

    code_type = forms.ChoiceField(
        label="验证方式",
        choices=[
            ("email", "邮箱验证"),
            ("phone", "手机验证"),
        ],
        initial="email",
        widget=forms.RadioSelect(),
    )

    verification_code = forms.CharField(
        label="验证码",
        max_length=10,
        widget=forms.TextInput(
            attrs={
                "class": "form-input",
                "placeholder": "请输入验证码",
            }
        ),
    )

    def clean_username(self) -> str:
        """验证用户名

        只做长度限制（3-20个字符），不限制字符类型
        允许所有Unicode字符（中文、英文、数字、特殊字符等）
        """
        username = self.cleaned_data["username"].strip()

        # 验证长度（3-20个字符）
        if len(username) < 3 or len(username) > 20:
            raise ValidationError("用户名长度必须在3-20个字符之间", code="invalid_username_length")

        # 检查是否包含控制字符（禁止控制字符，但允许其他所有字符）
        if any(ord(c) < 32 and c not in "\t\n\r" for c in username):
            raise ValidationError("用户名不能包含控制字符", code="invalid_username")

        # 检查是否为空（去除首尾空格后）
        if not username:
            raise ValidationError("用户名不能为空", code="invalid_username")

        from django.contrib.auth.models import User

        if User.objects.filter(username=username).exists():
            raise ValidationError("用户名已存在", code="username_exists")

        return username

    def clean(self) -> dict:
        """验证表单数据"""
        cleaned_data = super().clean()
        code_type = cleaned_data.get("code_type", "email")
        email = cleaned_data.get("email")
        phone = cleaned_data.get("phone")
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")

        # 验证邮箱或手机号至少提供一个
        if code_type == "email":
            if not email:
                raise ValidationError({"email": "使用邮箱验证时，邮箱不能为空"})
        elif code_type == "phone":
            if not phone:
                raise ValidationError({"phone": "使用手机验证时，手机号不能为空"})

        # 验证密码确认
        if password and password_confirm and password != password_confirm:
            raise ValidationError({"password_confirm": "两次输入的密码不一致"})

        # 密码强度验证（参考NIST SP 800-63B和OWASP最佳实践）
        if password:
            # 检查常见弱密码（可根据需要扩展）
            common_passwords = [
                "password",
                "12345678",
                "123456789",
                "1234567890",
                "qwerty123",
                "admin123",
                "welcome123",
                "letmein123",
            ]
            if password.lower() in common_passwords:
                raise ValidationError({"password": "密码过于简单，请选择更复杂的密码"})

            # 检查重复字符（如：aaaaaaa, 11111111）
            if len(set(password)) < 3:
                raise ValidationError({"password": "密码包含过多重复字符，请使用更复杂的密码"})

        return cleaned_data


class VerifyCodeForm(forms.Form):
    """验证码表单"""

    code_type = forms.ChoiceField(
        choices=[
            ("email", "邮箱验证码"),
            ("phone", "手机验证码"),
        ],
        label="验证码类型",
    )

    target = forms.CharField(label="目标（邮箱/手机号）", max_length=255)

    code = forms.CharField(label="验证码", max_length=10)

    purpose = forms.ChoiceField(
        choices=[
            ("register", "注册"),
            ("login", "登录"),
            ("reset_password", "重置密码"),
            ("activate", "激活账户"),
        ],
        required=False,
        initial="register",
    )


class ForgotPasswordForm(forms.Form):
    """忘记密码表单（第一步：输入用户名或邮箱）"""

    username_or_email = forms.CharField(
        label="用户名或邮箱",
        max_length=255,
        widget=forms.TextInput(
            attrs={"placeholder": "请输入用户名或注册邮箱", "autocomplete": "username"}
        ),
    )

    def clean_username_or_email(self):
        """验证用户名或邮箱格式"""
        username_or_email = self.cleaned_data.get("username_or_email", "").strip()
        if not username_or_email:
            raise forms.ValidationError("请输入用户名或邮箱")

        # 如果是邮箱格式，验证邮箱合法性
        if "@" in username_or_email:
            import re

            email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
            if not re.match(email_pattern, username_or_email):
                raise forms.ValidationError("邮箱格式不正确，请输入有效的邮箱地址")

        return username_or_email


class ResetPasswordForm(forms.Form):
    """重置密码表单（第二步：验证码+新密码）"""

    code = forms.CharField(
        label="验证码",
        max_length=10,
        widget=forms.TextInput(attrs={"placeholder": "请输入验证码", "maxlength": "10"}),
    )

    new_password = forms.CharField(
        label="新密码",
        min_length=8,
        widget=forms.PasswordInput(
            attrs={"placeholder": "请输入新密码（至少8位）", "autocomplete": "new-password"}
        ),
    )

    confirm_password = forms.CharField(
        label="确认密码",
        min_length=8,
        widget=forms.PasswordInput(
            attrs={"placeholder": "请再次输入新密码", "autocomplete": "new-password"}
        ),
    )

    def clean_new_password(self):
        """验证新密码强度（至少中级，50分以上）"""
        new_password = self.cleaned_data.get("new_password", "")
        if not new_password:
            return new_password

        score = self._calculate_password_score(new_password)

        if score < 50:
            raise forms.ValidationError(
                f"密码强度不足（当前{score}分），需要至少中级强度（50分以上）。"
                "建议：至少8位，包含大小写字母、数字和符号"
            )

        return new_password

    def clean(self):
        """验证密码一致性"""
        cleaned_data = super().clean()
        new_password = cleaned_data.get("new_password")
        confirm_password = cleaned_data.get("confirm_password")

        if new_password and confirm_password:
            if new_password != confirm_password:
                raise forms.ValidationError({"confirm_password": "两次输入的密码不一致"})

        return cleaned_data

    @staticmethod
    def _calculate_password_score(password: str) -> int:
        """
        计算密码强度评分

        评分标准：
        - 长度：<=4(5分), 5-7(10分), >=8(25分)
        - 字母：无(0分), 单一大小写(10分), 混合(20分)
        - 数字：无(0分), 1个(10分), 多个(20分)
        - 符号：无(0分), 1个(10分), 多个(25分)
        - 奖励：字母+数字(2分), 字母+数字+符号(3分), 大小写+数字+符号(5分)

        等级划分：
        - 0-24分：非常弱
        - 25-49分：弱
        - 50-59分：中（最低要求）
        - 60-69分：强
        - 70-79分：非常强
        - 80-89分：安全
        - 90+分：非常安全
        """
        if not password:
            return 0

        score = 0

        # 1. 密码长度评分
        if len(password) <= 4:
            score += 5
        elif 5 <= len(password) <= 7:
            score += 10
        elif len(password) >= 8:
            score += 25

        # 2. 字母评分
        has_lower = bool(re.search(r"[a-z]", password))
        has_upper = bool(re.search(r"[A-Z]", password))
        if not has_lower and not has_upper:
            score += 0
        elif (has_lower and not has_upper) or (not has_lower and has_upper):
            score += 10
        elif has_lower and has_upper:
            score += 20

        # 3. 数字评分
        digit_count = len(re.findall(r"\d", password))
        if digit_count == 0:
            score += 0
        elif digit_count == 1:
            score += 10
        else:
            score += 20

        # 4. 符号评分
        symbol_count = len(re.findall(r"[^a-zA-Z0-9]", password))
        if symbol_count == 0:
            score += 0
        elif symbol_count == 1:
            score += 10
        else:
            score += 25

        # 5. 奖励分（仅取最高项）
        if has_lower and has_upper and digit_count > 0 and symbol_count > 0:
            score += 5  # 大小写字母、数字和符号组合
        elif (has_lower or has_upper) and digit_count > 0 and symbol_count > 0:
            score += 3  # 字母、数字和符号组合
        elif (has_lower or has_upper) and digit_count > 0:
            score += 2  # 字母和数字组合

        return score
