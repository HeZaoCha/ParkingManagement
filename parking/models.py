"""
停车场管理系统数据模型

定义停车场、车位、车辆和停车记录等核心业务模型。
包含车牌号验证（符合GA 36-2018标准），确保不合规车牌不可入库。

Author: HeZaoCha
Created: 2024-12-09
Last Modified: 2025-12-11
Version: 1.1.0

车牌号规范（GA 36-2018）：
- 省份简称：京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼
- 地级市代号：A-Z（不含I、O，避免与数字1、0混淆）
- 序号：普通车5位，新能源车6位
- 特殊车牌：使领馆、挂车、学车、警车、港澳车牌
"""
from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone


# 中国省份简称列表
PROVINCE_ABBREVIATIONS = (
    '京', '津', '沪', '渝',  # 直辖市
    '冀', '豫', '云', '辽', '黑', '湘', '皖', '鲁',  # 省份
    '新', '苏', '浙', '赣', '鄂', '桂', '甘', '晋',
    '蒙', '陕', '吉', '闽', '贵', '粤', '青', '藏',
    '川', '宁', '琼',
    '使', '领',  # 使领馆车牌
)

# 地级市代号（A-Z，不含I、O）
CITY_CODES = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

# 中国车牌号正则表达式（GA 36-2018标准）
# 普通车牌：省+市+5位字母数字
# 新能源车牌：省+市+6位（小型车D/F开头，大型车D/F开头）
LICENSE_PLATE_PATTERN = re.compile(
    r'^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领]'
    r'[A-HJ-NP-Z]'  # 地级市代号，不含I、O
    r'(?:'
    r'[A-HJ-NP-Z0-9]{5}'  # 普通车牌：5位
    r'|'
    r'[DF][A-HJ-NP-Z0-9]{5}'  # 新能源小型车：D/F开头+5位
    r'|'
    r'[A-HJ-NP-Z0-9]{4}[DF]'  # 新能源大型车：4位+D/F
    r')'
    r'[挂学警港澳]?$'  # 可选的特殊后缀
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
        raise ValidationError('车牌号不能为空', code='empty_plate')
    
    # 规范化：转为大写，去除空格
    normalized = value.upper().strip()
    
    # 长度检查：普通7位，新能源8位，特殊最多9位
    if len(normalized) < 7 or len(normalized) > 9:
        raise ValidationError(
            f'车牌号长度不正确: {normalized}（应为7-8位）',
            code='invalid_length'
        )
    
    # 省份检查
    if normalized[0] not in PROVINCE_ABBREVIATIONS:
        raise ValidationError(
            f'无效的省份简称: {normalized[0]}',
            code='invalid_province'
        )
    
    # 地级市代号检查（不含I、O）
    if normalized[1] not in CITY_CODES:
        raise ValidationError(
            f'无效的地级市代号: {normalized[1]}（不能使用I和O）',
            code='invalid_city_code'
        )
    
    # 完整格式检查
    if not LICENSE_PLATE_PATTERN.match(normalized):
        raise ValidationError(
            f'车牌号格式不正确: {normalized}，请输入有效的中国车牌号',
            code='invalid_format'
        )


# 车牌号验证器实例
license_plate_validator = RegexValidator(
    regex=LICENSE_PLATE_PATTERN,
    message='请输入有效的中国车牌号码（如：粤E9KM03）',
    code='invalid_license_plate'
)


class ParkingLot(models.Model):
    """
    停车场模型
    
    表示一个停车场，包含停车场的基本信息、类型、结构和车位配置。
    支持多种停车场类型：露天停车场、立体停车楼、街道停车场、地下停车场。
    
    Author: HeZaoCha
    Created: 2024-12-09
    Last Modified: 2025-12-11
    Version: 1.1.0
    """
    
    LOT_TYPE_CHOICES = [
        ('outdoor', '露天停车场'),
        ('multi_story', '立体停车楼'),
        ('street', '街道停车场'),
        ('underground', '地下停车场'),
    ]
    
    name = models.CharField(
        max_length=100,
        verbose_name='停车场名称',
        help_text='停车场的名称'
    )
    address = models.CharField(
        max_length=200,
        verbose_name='地址',
        help_text='停车场的详细地址'
    )
    lot_type = models.CharField(
        max_length=20,
        choices=LOT_TYPE_CHOICES,
        default='outdoor',
        verbose_name='停车场类型',
        help_text='选择停车场类型：露天、立体停车楼、街道、地下'
    )
    # 楼层信息（JSON格式：["B2", "B3", "B4", "1F", "2F"]）
    floors = models.JSONField(
        default=list,
        blank=True,
        verbose_name='楼层列表',
        help_text='停车场的楼层信息，如["B2", "B3", "1F"]。露天停车场可为空'
    )
    # 区域信息（JSON格式：{"B2": ["A区", "B区", "C区"], "1F": ["A区", "B区"]}）
    areas = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='区域信息',
        help_text='各楼层的区域划分，格式：{"楼层": ["区域1", "区域2"]}'
    )
    total_spaces = models.PositiveIntegerField(
        default=0,
        verbose_name='总车位数',
        help_text='停车场的总车位数',
        validators=[MinValueValidator(0)]
    )
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('5.00'),
        verbose_name='每小时费率',
        help_text='停车每小时收费（元），仅在固定收费模式下使用',
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用',
        help_text='停车场是否正在运营'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        verbose_name = '停车场'
        verbose_name_plural = '停车场'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active'], name='lot_active_idx'),
        ]

    def __str__(self) -> str:
        """返回停车场的字符串表示"""
        return self.name

    @property
    def available_spaces(self) -> int:
        """
        获取可用车位数
        
        Returns:
            int: 当前可用的车位数
        """
        occupied = self.parking_spaces.filter(is_occupied=True).count()
        return max(0, self.total_spaces - occupied)

    @property
    def occupied_spaces(self) -> int:
        """
        获取已占用车位数
        
        Returns:
            int: 当前已占用的车位数
        """
        return self.parking_spaces.filter(is_occupied=True).count()


class ParkingSpace(models.Model):
    """
    停车位模型
    
    表示停车场中的一个具体停车位，支持楼层和区域信息。
    
    Author: HeZaoCha
    Created: 2024-12-09
    Last Modified: 2025-12-11
    Version: 1.1.0
    """
    SPACE_TYPE_CHOICES = [
        ('standard', '标准车位'),
        ('disabled', '残疾人车位'),
        ('vip', 'VIP车位'),
        ('large', '大型车位'),
    ]

    parking_lot = models.ForeignKey(
        ParkingLot,
        on_delete=models.CASCADE,
        related_name='parking_spaces',
        verbose_name='所属停车场'
    )
    floor = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='楼层',
        help_text='停车位所在楼层，如"B2"、"1F"等。露天停车场可为空'
    )
    area = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='区域',
        help_text='停车位所在区域，如"A区"、"B区"等'
    )
    space_number = models.CharField(
        max_length=20,
        verbose_name='车位编号',
        help_text='车位的唯一编号'
    )
    space_type = models.CharField(
        max_length=20,
        choices=SPACE_TYPE_CHOICES,
        default='standard',
        verbose_name='车位类型'
    )
    is_occupied = models.BooleanField(
        default=False,
        verbose_name='是否占用',
        help_text='车位当前是否被占用'
    )
    is_reserved = models.BooleanField(
        default=False,
        verbose_name='是否预留',
        help_text='车位是否被预留'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        verbose_name = '停车位'
        verbose_name_plural = '停车位'
        unique_together = [['parking_lot', 'space_number']]
        ordering = ['parking_lot', 'space_number']
        indexes = [
            models.Index(fields=['parking_lot', 'is_occupied'], name='space_lot_occupied_idx'),
            models.Index(fields=['is_occupied'], name='space_occupied_idx'),
        ]

    def __str__(self) -> str:
        """返回停车位的字符串表示"""
        return f"{self.parking_lot.name} - {self.space_number}"


class VIPVehicle(models.Model):
    """
    VIP/免费停车车辆模型
    
    记录享有免费停车或优惠停车的车辆。
    包括公司员工车辆、VIP客户车辆等。
    """
    VIP_TYPE_CHOICES = [
        ('employee', '员工车辆'),
        ('vip', 'VIP客户'),
        ('partner', '合作伙伴'),
        ('government', '政府公务'),
        ('other', '其他'),
    ]
    
    license_plate = models.CharField(
        max_length=10,
        unique=True,
        verbose_name='车牌号',
        help_text='享有免费/优惠停车的车牌号',
        db_index=True,
        validators=[license_plate_validator]
    )
    vip_type = models.CharField(
        max_length=20,
        choices=VIP_TYPE_CHOICES,
        default='employee',
        verbose_name='类型'
    )
    owner_name = models.CharField(
        max_length=100,
        verbose_name='车主姓名',
        help_text='车主/员工姓名'
    )
    department = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='部门',
        help_text='所属部门（员工车辆）'
    )
    discount_rate = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('1.00'),
        verbose_name='折扣率',
        help_text='1.00表示免费，0.50表示半价',
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    valid_from = models.DateField(
        verbose_name='生效日期',
        help_text='免费/优惠开始日期'
    )
    valid_until = models.DateField(
        null=True,
        blank=True,
        verbose_name='失效日期',
        help_text='免费/优惠结束日期，空表示永久有效'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='备注'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_vip_vehicles',
        verbose_name='创建人'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        verbose_name = 'VIP/免费车辆'
        verbose_name_plural = 'VIP/免费车辆'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['license_plate'], name='vip_plate_idx'),
            models.Index(fields=['is_active', 'valid_until'], name='vip_active_valid_idx'),
        ]
    
    def __str__(self) -> str:
        return f"{self.license_plate} ({self.get_vip_type_display()})"
    
    @property
    def is_valid(self) -> bool:
        """检查VIP状态是否有效"""
        if not self.is_active:
            return False
        
        today = timezone.now().date()
        if self.valid_from > today:
            return False
        if self.valid_until and self.valid_until < today:
            return False
        
        return True
    
    @property
    def is_free(self) -> bool:
        """是否完全免费"""
        return self.discount_rate >= Decimal('1.00')
    
    def clean(self) -> None:
        super().clean()
        if self.license_plate:
            self.license_plate = self.license_plate.upper().strip()
            validate_license_plate(self.license_plate)
    
    def save(self, *args, **kwargs) -> None:
        if self.license_plate:
            self.license_plate = self.license_plate.upper().strip()
        self.full_clean()
        super().save(*args, **kwargs)


class Vehicle(models.Model):
    """
    车辆模型
    
    表示进入停车场的车辆信息。
    包含车牌号验证（GA 36-2018标准），确保只有合规车牌可以入库。
    """
    VEHICLE_TYPE_CHOICES = [
        ('car', '小型车'),
        ('suv', 'SUV'),
        ('truck', '货车'),
        ('motorcycle', '摩托车'),
        ('new_energy', '新能源车'),
    ]

    license_plate = models.CharField(
        max_length=10,
        unique=True,
        verbose_name='车牌号',
        help_text='车辆的车牌号码（如：粤E9KM03）',
        db_index=True,
        validators=[license_plate_validator]
    )
    vehicle_type = models.CharField(
        max_length=20,
        choices=VEHICLE_TYPE_CHOICES,
        default='car',
        verbose_name='车辆类型'
    )
    owner_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='车主姓名',
        help_text='车辆所有者的姓名'
    )
    owner_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='车主电话',
        help_text='车辆所有者的联系电话'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        verbose_name = '车辆'
        verbose_name_plural = '车辆'
        ordering = ['-created_at']

    def __str__(self) -> str:
        """返回车辆的字符串表示"""
        return self.license_plate
    
    @property
    def is_vip(self) -> bool:
        """检查是否为VIP/免费停车车辆"""
        return VIPVehicle.objects.filter(
            license_plate=self.license_plate,
            is_active=True
        ).exists()
    
    def get_vip_info(self) -> VIPVehicle | None:
        """获取VIP信息"""
        try:
            vip = VIPVehicle.objects.get(
                license_plate=self.license_plate,
                is_active=True
            )
            if vip.is_valid:
                return vip
        except VIPVehicle.DoesNotExist:
            pass
        return None
    
    def clean(self) -> None:
        """
        模型层验证
        
        确保车牌号格式正确，不合规车牌不可入库。
        """
        super().clean()
        
        # 规范化车牌号
        if self.license_plate:
            self.license_plate = self.license_plate.upper().strip()
            
            # 额外验证
            validate_license_plate(self.license_plate)
    
    def save(self, *args, **kwargs) -> None:
        """
        保存前规范化车牌号并验证
        """
        # 规范化车牌号
        if self.license_plate:
            self.license_plate = self.license_plate.upper().strip()
        
        # 执行 full_clean 确保验证通过
        self.full_clean()
        
        super().save(*args, **kwargs)


class ParkingRecord(models.Model):
    """
    停车记录模型
    
    记录车辆的进出场信息和费用。
    """
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='parking_records',
        verbose_name='车辆'
    )
    parking_space = models.ForeignKey(
        ParkingSpace,
        on_delete=models.CASCADE,
        related_name='parking_records',
        verbose_name='停车位'
    )
    entry_time = models.DateTimeField(
        verbose_name='入场时间',
        help_text='车辆进入停车场的时间'
    )
    exit_time = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='出场时间',
        help_text='车辆离开停车场的时间'
    )
    duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='停车时长（分钟）',
        help_text='车辆停车的总时长（分钟）'
    )
    fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='停车费用',
        help_text='本次停车的费用（元）',
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    is_paid = models.BooleanField(
        default=False,
        verbose_name='是否已支付',
        help_text='停车费用是否已支付'
    )
    operator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='parking_records',
        verbose_name='操作员',
        help_text='处理该停车记录的操作员'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='备注',
        help_text='关于本次停车记录的备注信息'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        verbose_name = '停车记录'
        verbose_name_plural = '停车记录'
        ordering = ['-entry_time']
        indexes = [
            models.Index(fields=['-entry_time'], name='record_entry_time_idx'),
            models.Index(fields=['vehicle', '-entry_time'], name='record_vehicle_entry_idx'),
            models.Index(fields=['exit_time'], name='record_exit_time_idx'),
            models.Index(fields=['is_paid'], name='record_is_paid_idx'),
            models.Index(fields=['parking_space', 'entry_time'], name='record_space_entry_idx'),
        ]

    def __str__(self) -> str:
        """返回停车记录的字符串表示"""
        return f"{self.vehicle.license_plate} - {self.entry_time.strftime('%Y-%m-%d %H:%M')}"

    is_free_parking = models.BooleanField(
        default=False,
        verbose_name='免费停车',
        help_text='本次停车是否免费（VIP/员工车辆）'
    )
    discount_rate = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='折扣率',
        help_text='应用的折扣率'
    )
    # 车牌号地址信息（从车牌号解析）
    plate_province_code = models.CharField(
        max_length=2,
        blank=True,
        verbose_name='车牌省份简称',
        help_text='从车牌号解析的省份简称，如：粤'
    )
    plate_province_name = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='车牌省份名称',
        help_text='从车牌号解析的省份全称'
    )
    plate_city_code = models.CharField(
        max_length=1,
        blank=True,
        verbose_name='车牌地级市代号',
        help_text='从车牌号解析的地级市代号，如：E'
    )
    plate_city_name = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='车牌地级市名称',
        help_text='从车牌号解析的地级市全称'
    )
    
    def calculate_fee(self) -> Decimal:
        """
        计算停车费用
        
        根据停车时长和停车场费率计算费用。
        支持固定小时收费和阶梯制收费。
        支持VIP/员工车辆免费或折扣。
        
        Author: HeZaoCha
        Created: 2024-12-09
        Last Modified: 2025-12-11
        Version: 1.1.0
        
        Returns:
            Decimal: 计算得出的停车费用
        """
        # 检查是否为VIP/员工免费车辆
        vip_info = self.vehicle.get_vip_info()
        if vip_info and vip_info.is_free:
            self.is_free_parking = True
            self.discount_rate = vip_info.discount_rate
            return Decimal('0.00')
        
        if not self.exit_time:
            # 如果还未出场，计算到当前时间的费用
            end_time = timezone.now()
        else:
            end_time = self.exit_time

        # 计算停车时长（分钟）
        duration = end_time - self.entry_time
        duration_minutes = int(duration.total_seconds() / 60)
        
        parking_lot = self.parking_space.parking_lot
        
        # 获取费率配置
        try:
            pricing_config = parking_lot.pricing_config
        except AttributeError:
            pricing_config = None
        
        # 计算费用（使用match/case优化）
        if pricing_config:
            match pricing_config.charge_type:
                case 'tiered':
                    # 阶梯制收费
                    fee = self._calculate_tiered_fee(
                        duration_minutes,
                        pricing_config,
                        parking_lot
                    )
                case 'fixed' | _:
                    # 固定小时收费（原有逻辑）
                    duration_hours = duration.total_seconds() / 3600
                    # 向上取整到小时
                    hours = int(duration_hours) + (1 if duration_hours % 1 > 0 else 0)
                    hours_decimal = Decimal(str(hours))
                    fee = hours_decimal * parking_lot.hourly_rate
        else:
            # 无配置，使用固定费率
            duration_hours = duration.total_seconds() / 3600
            hours = int(duration_hours) + (1 if duration_hours % 1 > 0 else 0)
            hours_decimal = Decimal(str(hours))
            fee = hours_decimal * parking_lot.hourly_rate
        
        # 应用VIP折扣
        if vip_info:
            self.discount_rate = vip_info.discount_rate
            # discount_rate为1表示免费，0.5表示半价，0表示全价
            discount = Decimal('1.00') - vip_info.discount_rate
            fee = fee * discount
        
        # 应用每日收费上限
        if pricing_config:
            daily_max = pricing_config.get_daily_max_fee()
            if daily_max and fee > daily_max:
                fee = daily_max
        
        return fee.quantize(Decimal('0.01'))
    
    def _calculate_tiered_fee(
        self,
        duration_minutes: int,
        pricing_config: ParkingLotPricing,
        parking_lot: ParkingLot
    ) -> Decimal:
        """
        计算阶梯制费用
        
        Args:
            duration_minutes: 停车时长（分钟）
            pricing_config: 费率配置
            parking_lot: 停车场对象
            
        Returns:
            Decimal: 计算得出的费用
        """
        from .pricing_models import ParkingLotPricing
        
        # 获取免费时长
        free_minutes = pricing_config.get_free_minutes()
        if duration_minutes <= free_minutes:
            return Decimal('0.00')
        
        # 获取费率规则
        rules = pricing_config.get_effective_rules()
        if not rules:
            # 如果没有规则，使用固定费率
            duration_hours = duration_minutes / 60
            hours = int(duration_hours) + (1 if duration_hours % 1 > 0 else 0)
            return Decimal(str(hours)) * parking_lot.hourly_rate
        
        # 按规则计算费用
        total_fee = Decimal('0.00')
        remaining_minutes = duration_minutes - free_minutes
        
        for rule in sorted(rules, key=lambda x: x['start_minutes']):
            start = rule['start_minutes']
            end = rule.get('end_minutes')
            rate_per_hour = Decimal(str(rule['rate_per_hour']))
            
            if remaining_minutes <= 0:
                break
            
            # 计算此规则适用的分钟数
            rule_start = max(0, start - free_minutes)
            rule_end = (end - free_minutes) if end else None
            
            if rule_end is None:
                # 无上限，全部按此费率计算
                hours = remaining_minutes / 60
                hours_ceil = int(hours) + (1 if hours % 1 > 0 else 0)
                total_fee += Decimal(str(hours_ceil)) * rate_per_hour
                break
            else:
                # 有上限，计算此规则范围内的费用
                if remaining_minutes <= rule_start:
                    continue
                
                applicable_minutes = min(remaining_minutes, rule_end) - rule_start
                if applicable_minutes > 0:
                    hours = applicable_minutes / 60
                    hours_ceil = int(hours) + (1 if hours % 1 > 0 else 0)
                    total_fee += Decimal(str(hours_ceil)) * rate_per_hour
                    remaining_minutes -= applicable_minutes
        
        return total_fee

    def save(self, *args, **kwargs) -> None:
        """
        保存停车记录时自动计算费用和时长
        
        Args:
            *args: 位置参数
            **kwargs: 关键字参数
        """
        if self.exit_time and self.entry_time:
            # 计算停车时长（分钟）
            duration = self.exit_time - self.entry_time
            self.duration_minutes = int(duration.total_seconds() / 60)
            
            # 计算费用（包含VIP/免费检查）
            if self.fee is None:
                self.fee = self.calculate_fee()
        
        super().save(*args, **kwargs)
