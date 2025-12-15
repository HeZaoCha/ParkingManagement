"""
车牌号地址映射模型

根据全国汽车牌照号详解细表，建立车牌号与地址的映射关系。
用于保存和查询车辆所属地区信息。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.2.0

参考文档：
https://baike.baidu.com/item/%E5%85%A8%E5%9B%BD%E6%B1%BD%E8%BD%A6%E7%89%8C%E7%85%A7%E5%8F%B7%E8%AF%A6%E8%A7%A3%E7%BB%86%E8%A1%A8/1503883
"""

from django.db import models
from django.utils import timezone


class Province(models.Model):
    """省份模型"""

    code = models.CharField(max_length=2, unique=True, verbose_name="省份简称")
    name = models.CharField(max_length=50, verbose_name="省份全称")
    is_special = models.BooleanField(default=False, verbose_name="是否特殊地区（港澳台）")

    class Meta:
        verbose_name = "省份"
        verbose_name_plural = "省份"
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class City(models.Model):
    """地级市模型"""

    province = models.ForeignKey(
        Province, on_delete=models.CASCADE, related_name="cities", verbose_name="所属省份"
    )
    code = models.CharField(max_length=1, verbose_name="地级市代号")
    name = models.CharField(max_length=50, verbose_name="地级市名称")
    is_capital = models.BooleanField(default=False, verbose_name="是否省会")

    class Meta:
        verbose_name = "地级市"
        verbose_name_plural = "地级市"
        unique_together = ("province", "code")
        ordering = ["province", "code"]

    def __str__(self):
        return f"{self.province.code}{self.code} - {self.name}"


class LicensePlateLocation(models.Model):
    """车牌号位置映射模型"""

    license_plate_prefix = models.CharField(
        max_length=2,
        unique=True,
        verbose_name="车牌号前缀",
        help_text="省份简称+地级市代号，如：粤E",
    )
    province = models.ForeignKey(
        Province, on_delete=models.CASCADE, related_name="plate_locations", verbose_name="省份"
    )
    city = models.ForeignKey(
        City, on_delete=models.CASCADE, related_name="plate_locations", verbose_name="地级市"
    )
    description = models.TextField(blank=True, verbose_name="详细描述", help_text="可包含区县信息")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "车牌号位置映射"
        verbose_name_plural = "车牌号位置映射"
        ordering = ["license_plate_prefix"]
        indexes = [
            models.Index(fields=["license_plate_prefix"]),
            models.Index(fields=["province", "city"]),
        ]

    def __str__(self):
        return f"{self.license_plate_prefix} - {self.city.name}"

    @classmethod
    def get_location_by_plate(cls, license_plate: str) -> dict:
        """
        根据车牌号获取地址信息

        Args:
            license_plate: 完整车牌号，如：粤E9KM03

        Returns:
            dict: 包含省份、城市等信息的字典
        """
        if len(license_plate) < 2:
            return {}

        prefix = license_plate[:2].upper()
        try:
            location = cls.objects.select_related("province", "city").get(
                license_plate_prefix=prefix
            )
            return {
                "province_code": location.province.code,
                "province_name": location.province.name,
                "city_code": location.city.code,
                "city_name": location.city.name,
                "prefix": prefix,
                "description": location.description,
            }
        except cls.DoesNotExist:
            return {}


class WantedVehicle(models.Model):
    """通缉车辆模型"""

    STATUS_CHOICES = [
        ("active", "通缉中"),
        ("caught", "已抓获"),
        ("cancelled", "已取消"),
    ]

    license_plate = models.CharField(max_length=10, db_index=True, verbose_name="车牌号")
    vehicle_type = models.CharField(max_length=20, blank=True, verbose_name="车辆类型")
    description = models.TextField(verbose_name="通缉描述", help_text="通缉原因、车辆特征等")
    case_number = models.CharField(max_length=100, blank=True, verbose_name="案件编号")
    contact_police = models.CharField(max_length=100, blank=True, verbose_name="联系人/单位")
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name="联系电话")

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="active", verbose_name="状态"
    )
    priority = models.IntegerField(
        default=1, verbose_name="优先级", help_text="1-10，数字越大优先级越高"
    )

    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_wanted_vehicles",
        verbose_name="创建人",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name="取消时间")

    class Meta:
        verbose_name = "通缉车辆"
        verbose_name_plural = "通缉车辆"
        ordering = ["-priority", "-created_at"]
        indexes = [
            models.Index(fields=["license_plate", "status"]),
            models.Index(fields=["status", "priority"]),
        ]

    def __str__(self):
        return f"{self.license_plate} - {self.get_status_display()}"

    def cancel(self, user=None):
        """取消通缉"""
        self.status = "cancelled"
        self.cancelled_at = timezone.now()
        self.save(update_fields=["status", "cancelled_at"])


class VehicleAlertLog(models.Model):
    """车辆警报日志"""

    wanted_vehicle = models.ForeignKey(
        WantedVehicle, on_delete=models.CASCADE, related_name="alert_logs", verbose_name="通缉车辆"
    )
    parking_record = models.ForeignKey(
        "ParkingRecord",
        on_delete=models.CASCADE,
        related_name="alert_logs",
        verbose_name="停车记录",
    )
    alert_time = models.DateTimeField(auto_now_add=True, verbose_name="警报时间")
    notified_users = models.ManyToManyField(
        "auth.User", blank=True, related_name="received_alerts", verbose_name="已通知用户"
    )
    is_handled = models.BooleanField(default=False, verbose_name="是否已处理")
    handled_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_alerts",
        verbose_name="处理人",
    )
    handled_at = models.DateTimeField(null=True, blank=True, verbose_name="处理时间")
    notes = models.TextField(blank=True, verbose_name="处理备注")

    class Meta:
        verbose_name = "车辆警报日志"
        verbose_name_plural = "车辆警报日志"
        ordering = ["-alert_time"]
        indexes = [
            models.Index(fields=["alert_time", "is_handled"]),
            models.Index(fields=["wanted_vehicle", "is_handled"]),
        ]

    def __str__(self):
        return f"{self.wanted_vehicle.license_plate} - {self.alert_time}"
