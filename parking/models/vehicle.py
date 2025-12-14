"""
车辆模型

从 parking.models 迁移
"""
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from parking.models.validators import license_plate_validator, validate_license_plate


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
        indexes = [
            # 按车辆类型统计优化
            models.Index(fields=['vehicle_type'], name='vehicle_type_idx'),
            # 按创建时间查询优化
            models.Index(fields=['-created_at'], name='vehicle_created_at_idx'),
        ]

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
