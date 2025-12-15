"""
停车场阶梯收费模型

提供阶梯收费费率模板、费率规则等数据模型。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.1.0
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class PricingTemplate(models.Model):
    """
    费率模板模型

    用于保存和管理不同的收费标准模板，支持快速应用到停车场。
    """

    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="模板名称",
        help_text='费率模板的名称，如"标准阶梯收费"、"优惠收费"等',
    )
    description = models.TextField(
        blank=True, null=True, verbose_name="模板描述", help_text="模板的详细说明"
    )
    free_minutes = models.PositiveIntegerField(
        default=15,
        verbose_name="免费时长（分钟）",
        help_text="停车多长时间内免费，如15分钟、30分钟",
    )
    daily_max_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="每日收费上限（元）",
        help_text="设置每日最高收费，超过此金额不再计费。为空表示不设上限",
    )
    is_active = models.BooleanField(default=True, verbose_name="是否启用", help_text="模板是否可用")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "费率模板"
        verbose_name_plural = "费率模板"
        ordering = ["-created_at"]
        db_table = "parking_pricing_template"

    def __str__(self) -> str:
        return f"{self.name} (免费{self.free_minutes}分钟)"

    def clean(self) -> None:
        """验证模板数据"""
        if self.daily_max_fee and self.daily_max_fee < Decimal("0.01"):
            raise ValidationError("每日收费上限必须大于0")

    def save(self, *args, **kwargs) -> None:
        self.full_clean()
        super().save(*args, **kwargs)


class PricingRule(models.Model):
    """
    费率规则模型

    定义阶梯收费的具体规则，属于某个费率模板。
    """

    VEHICLE_TYPE_CHOICES = [
        ("standard", "标准车位"),
        ("disabled", "残疾人车位"),
        ("vip", "VIP车位"),
        ("large", "大型车位"),
        ("all", "全部类型"),  # 适用于所有车位类型
    ]

    template = models.ForeignKey(
        PricingTemplate, on_delete=models.CASCADE, related_name="rules", verbose_name="费率模板"
    )
    start_minutes = models.PositiveIntegerField(
        verbose_name="起始分钟", help_text="此规则开始生效的分钟数（包含）"
    )
    end_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="结束分钟",
        help_text="此规则结束的分钟数（不包含）。为空表示无上限",
    )
    rate_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="每小时费率（元）",
        help_text="此时间段内每小时收费金额",
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    vehicle_type = models.CharField(
        max_length=20,
        choices=VEHICLE_TYPE_CHOICES,
        default="all",
        verbose_name="车位类型",
        help_text="此规则适用的车位类型，选择'全部类型'则适用于所有车位",
    )
    order = models.PositiveIntegerField(
        default=0, verbose_name="排序", help_text="规则执行顺序，数字越小越先执行"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")

    class Meta:
        verbose_name = "费率规则"
        verbose_name_plural = "费率规则"
        ordering = ["template", "order", "start_minutes"]
        db_table = "parking_pricing_rule"
        indexes = [
            models.Index(fields=["template", "order"]),
        ]

    def __str__(self) -> str:
        end_str = f"-{self.end_minutes}分钟" if self.end_minutes else "以上"
        vehicle_type_display = self.get_vehicle_type_display()
        return (
            f"{self.template.name}: {self.start_minutes}{end_str}分钟，"
            f"{self.rate_per_hour}元/小时（{vehicle_type_display}）"
        )

    def clean(self) -> None:
        """验证规则数据"""
        if self.end_minutes and self.end_minutes <= self.start_minutes:
            raise ValidationError("结束分钟必须大于起始分钟")

        # 检查规则是否重叠
        if self.pk:
            overlapping = PricingRule.objects.filter(
                template=self.template,
                start_minutes__lt=self.end_minutes or 999999,
                end_minutes__gt=self.start_minutes,
            ).exclude(pk=self.pk)
        else:
            overlapping = PricingRule.objects.filter(
                template=self.template,
                start_minutes__lt=self.end_minutes or 999999,
                end_minutes__gt=self.start_minutes,
            )

        if overlapping.exists():
            raise ValidationError("费率规则时间段不能重叠")

    def save(self, *args, **kwargs) -> None:
        self.full_clean()
        super().save(*args, **kwargs)


class ParkingLotPricing(models.Model):
    """
    停车场费率配置模型

    关联停车场和费率模板，支持自定义费率。
    """

    CHARGE_TYPE_CHOICES = [
        ("fixed", "固定小时收费"),
        ("tiered", "阶梯制收费"),
    ]

    parking_lot = models.OneToOneField(
        "parking.ParkingLot",
        on_delete=models.CASCADE,
        related_name="pricing_config",
        verbose_name="停车场",
    )
    charge_type = models.CharField(
        max_length=20,
        choices=CHARGE_TYPE_CHOICES,
        default="fixed",
        verbose_name="收费类型",
        help_text="固定小时收费或阶梯制收费",
    )
    template = models.ForeignKey(
        PricingTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="parking_lots",
        verbose_name="费率模板",
        help_text="选择已保存的费率模板，或留空使用自定义费率",
    )
    # 固定收费模式
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="每小时费率（元）",
        help_text="固定收费模式下的每小时收费",
    )
    # 阶梯收费模式
    free_minutes = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="免费时长（分钟）", help_text="阶梯收费模式下的免费时长"
    )
    daily_max_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="每日收费上限（元）",
        help_text="设置每日最高收费，超过此金额不再计费",
    )
    # 自定义费率规则（JSON格式存储）
    custom_rules = models.JSONField(
        default=list,
        blank=True,
        verbose_name="自定义费率规则",
        help_text='自定义的阶梯收费规则，格式：[{"start_minutes": 15, "end_minutes": 60, "rate_per_hour": 5.00}, ...]',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "停车场费率配置"
        verbose_name_plural = "停车场费率配置"
        db_table = "parking_lot_pricing"

    def __str__(self) -> str:
        return f"{self.parking_lot.name} - {self.get_charge_type_display()}"

    def get_effective_rules(self) -> list[dict[str, int | float | None]]:
        """
        获取有效的费率规则

        Returns:
            list[dict[str, int | float | None]]: 费率规则列表
        """
        # 使用match/case优化（Python 3.10+特性）
        match self.charge_type:
            case "fixed":
                return []
            case "tiered":
                if self.template:
                    # 使用模板规则
                    rules = self.template.rules.all().order_by("order", "start_minutes")
                    return [
                        {
                            "start_minutes": rule.start_minutes,
                            "end_minutes": rule.end_minutes,
                            "rate_per_hour": float(rule.rate_per_hour),
                        }
                        for rule in rules
                    ]
                else:
                    # 使用自定义规则
                    return self.custom_rules or []
            case _:
                return []

    def get_free_minutes(self) -> int:
        """获取免费时长"""
        # 使用match/case优化（Python 3.10+特性）
        match self.charge_type:
            case "fixed":
                return 15  # 默认15分钟免费
            case "tiered":
                if self.template:
                    return self.template.free_minutes
                return self.free_minutes or 15
            case _:
                return 15

    def get_daily_max_fee(self) -> Decimal | None:
        """获取每日收费上限"""
        if self.template:
            return self.template.daily_max_fee
        return self.daily_max_fee


class MonthYearRate(models.Model):
    """
    包月/包年费率模型

    定义费率模板的包月、包年收费标准。
    """

    TYPE_CHOICES = [
        ("month", "月卡"),
        ("quarter", "季卡"),
        ("year", "年卡"),
    ]

    template = models.ForeignKey(
        PricingTemplate,
        on_delete=models.CASCADE,
        related_name="month_year_rates",
        verbose_name="费率模板",
    )
    rate_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        verbose_name="类型",
        help_text="包月、包季或包年",
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="价格（元）",
        help_text="包月/包年费用",
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    vehicle_type = models.CharField(
        max_length=20,
        choices=PricingRule.VEHICLE_TYPE_CHOICES,
        default="all",
        verbose_name="车位类型",
        help_text="适用的车位类型",
    )
    description = models.TextField(
        blank=True, null=True, verbose_name="说明", help_text="包月/包年套餐的详细说明"
    )
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "包月/包年费率"
        verbose_name_plural = "包月/包年费率"
        ordering = ["template", "rate_type", "vehicle_type"]
        db_table = "parking_month_year_rate"
        indexes = [
            models.Index(fields=["template", "rate_type"]),
        ]

    def __str__(self) -> str:
        vehicle_type_display = self.get_vehicle_type_display()
        return f"{self.template.name} - {self.get_rate_type_display()} - ¥{self.price} ({vehicle_type_display})"

    def clean(self) -> None:
        """验证数据"""
        if self.price < Decimal("0.01"):
            raise ValidationError("价格必须大于0")

    def save(self, *args, **kwargs) -> None:
        self.full_clean()
        super().save(*args, **kwargs)


class OvertimeRate(models.Model):
    """
    超时收费模型

    定义费率模板的超时收费标准。
    """

    template = models.ForeignKey(
        PricingTemplate,
        on_delete=models.CASCADE,
        related_name="overtime_rates",
        verbose_name="费率模板",
    )
    overtime_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="超时费用（元/小时）",
        help_text="超过每日收费上限后的超时收费标准",
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    overtime_start_hours = models.PositiveIntegerField(
        default=24,
        verbose_name="超时起始小时",
        help_text="超过多少小时后开始收取超时费用（默认24小时）",
    )
    vehicle_type = models.CharField(
        max_length=20,
        choices=PricingRule.VEHICLE_TYPE_CHOICES,
        default="all",
        verbose_name="车位类型",
        help_text="适用的车位类型",
    )
    description = models.TextField(
        blank=True, null=True, verbose_name="说明", help_text="超时收费的详细说明"
    )
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "超时收费"
        verbose_name_plural = "超时收费"
        ordering = ["template", "vehicle_type"]
        db_table = "parking_overtime_rate"
        indexes = [
            models.Index(fields=["template", "vehicle_type"]),
        ]

    def __str__(self) -> str:
        vehicle_type_display = self.get_vehicle_type_display()
        return (
            f"{self.template.name} - 超时费¥{self.overtime_fee}/小时 "
            f"（{vehicle_type_display}，{self.overtime_start_hours}小时后）"
        )

    def clean(self) -> None:
        """验证数据"""
        if self.overtime_fee < Decimal("0.01"):
            raise ValidationError("超时费用必须大于0")
        if self.overtime_start_hours < 1:
            raise ValidationError("超时起始小时必须大于0")

    def save(self, *args, **kwargs) -> None:
        self.full_clean()
        super().save(*args, **kwargs)
