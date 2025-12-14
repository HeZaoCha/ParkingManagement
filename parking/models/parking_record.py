"""
停车记录模型

从 parking.models 迁移
"""
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from parking.models.parking_space import ParkingSpace
from parking.models.vehicle import Vehicle


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
            # 公安查询优化：按地区查询
            models.Index(fields=['plate_province_code', 'plate_city_code'], name='record_plate_location_idx'),
            models.Index(fields=['plate_province_code', 'entry_time'], name='record_province_entry_idx'),
            # 日期范围查询优化
            models.Index(fields=['entry_time', 'exit_time'], name='record_date_range_idx'),
        ]

    def __str__(self) -> str:
        """返回停车记录的字符串表示"""
        return f"{self.vehicle.license_plate} - {self.entry_time.strftime('%Y-%m-%d %H:%M')}"
    
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
        
        # 获取费率配置（延迟导入避免循环依赖）
        try:
            from parking.pricing_models import ParkingLotPricing
            pricing_config = parking_lot.pricing_config
        except (AttributeError, ImportError):
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
        pricing_config,
        parking_lot
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
