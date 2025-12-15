"""
Django管理后台配置

为停车场管理系统的模型提供管理界面。

Author: HeZaoCha
Created: 2024-12-09
Last Modified: 2025-12-11
Version: 1.1.0
"""

from django.contrib import admin
from django.utils.html import format_html

from parking.models import ParkingLot, ParkingRecord, ParkingSpace, Vehicle
from parking.license_plate_models import (
    LicensePlateLocation,
    Province,
    City,
    VehicleAlertLog,
    WantedVehicle,
)
from parking.pricing_models import (
    MonthYearRate,
    OvertimeRate,
    ParkingLotPricing,
    PricingRule,
    PricingTemplate,
)
from parking.user_models import ContactMessage, StaffSchedule, UserProfile, VerificationCode


@admin.register(ParkingLot)
class ParkingLotAdmin(admin.ModelAdmin):
    """停车场管理"""

    list_display = [
        "name",
        "address",
        "total_spaces",
        "available_spaces_display",
        "hourly_rate",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "address"]
    readonly_fields = [
        "created_at",
        "updated_at",
        "available_spaces_display",
        "occupied_spaces_display",
    ]

    fieldsets = (
        ("基本信息", {"fields": ("name", "address", "is_active")}),
        (
            "车位配置",
            {"fields": ("total_spaces", "available_spaces_display", "occupied_spaces_display")},
        ),
        ("费率设置", {"fields": ("hourly_rate",)}),
        ("时间信息", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def available_spaces_display(self, obj: ParkingLot) -> str:
        """显示可用车位数"""
        available = obj.available_spaces
        total = obj.total_spaces
        color = "green" if available > 0 else "red"
        return format_html('<span style="color: {};">{}</span> / {}', color, available, total)

    available_spaces_display.short_description = "可用/总车位"

    def occupied_spaces_display(self, obj: ParkingLot) -> int:
        """显示已占用车位数"""
        return obj.occupied_spaces

    occupied_spaces_display.short_description = "已占用"


@admin.register(ParkingSpace)
class ParkingSpaceAdmin(admin.ModelAdmin):
    """停车位管理"""

    list_display = [
        "space_number",
        "parking_lot",
        "space_type",
        "is_occupied",
        "is_reserved",
        "created_at",
    ]
    list_filter = ["parking_lot", "space_type", "is_occupied", "is_reserved"]
    search_fields = ["space_number", "parking_lot__name"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("基本信息", {"fields": ("parking_lot", "space_number", "space_type")}),
        ("状态", {"fields": ("is_occupied", "is_reserved")}),
        ("时间信息", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    """车辆管理"""

    list_display = ["license_plate", "vehicle_type", "owner_name", "owner_phone", "created_at"]
    list_filter = ["vehicle_type", "created_at"]
    search_fields = ["license_plate", "owner_name", "owner_phone"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ParkingRecord)
class ParkingRecordAdmin(admin.ModelAdmin):
    """停车记录管理"""

    list_display = [
        "vehicle",
        "parking_space",
        "entry_time",
        "exit_time",
        "duration_display",
        "fee",
        "is_paid",
        "operator",
    ]
    list_filter = ["is_paid", "entry_time", "parking_space__parking_lot"]
    search_fields = ["vehicle__license_plate", "parking_space__space_number"]
    readonly_fields = ["created_at", "updated_at", "duration_display"]
    date_hierarchy = "entry_time"

    fieldsets = (
        ("基本信息", {"fields": ("vehicle", "parking_space", "operator")}),
        ("时间信息", {"fields": ("entry_time", "exit_time", "duration_display")}),
        ("费用信息", {"fields": ("fee", "is_paid")}),
        ("备注", {"fields": ("notes",)}),
        ("时间信息", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def duration_display(self, obj: ParkingRecord) -> str:
        """显示停车时长"""
        if obj.duration_minutes:
            hours = obj.duration_minutes // 60
            minutes = obj.duration_minutes % 60
            return f"{hours}小时{minutes}分钟"
        return "-"

    duration_display.short_description = "停车时长"


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """用户资料管理"""

    list_display = ["user", "role", "phone", "email_verified", "phone_verified", "created_at"]
    list_filter = ["role", "email_verified", "phone_verified"]
    search_fields = ["user__username", "user__email", "phone"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    """验证码管理"""

    list_display = ["code_type", "purpose", "target", "code", "is_used", "expires_at", "created_at"]
    list_filter = ["code_type", "purpose", "is_used", "expires_at"]
    search_fields = ["target", "code"]
    readonly_fields = ["created_at"]
    date_hierarchy = "created_at"


@admin.register(StaffSchedule)
class StaffScheduleAdmin(admin.ModelAdmin):
    """排班表管理"""

    list_display = ["user", "parking_lot", "weekday", "start_time", "end_time", "is_active"]
    list_filter = ["parking_lot", "weekday", "is_active"]
    search_fields = ["user__username", "parking_lot__name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    """联系消息管理"""

    list_display = ["name", "email", "message_type", "subject", "status", "created_at"]
    list_filter = ["message_type", "status", "created_at"]
    search_fields = ["name", "email", "subject", "content"]
    readonly_fields = ["created_at"]
    date_hierarchy = "created_at"


@admin.register(PricingTemplate)
class PricingTemplateAdmin(admin.ModelAdmin):
    """费率模板管理"""

    list_display = ["name", "free_minutes", "daily_max_fee", "is_active", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = []


@admin.register(PricingRule)
class PricingRuleAdmin(admin.ModelAdmin):
    """费率规则管理"""

    list_display = [
        "template",
        "start_minutes",
        "end_minutes",
        "rate_per_hour",
        "vehicle_type",
        "order",
    ]
    list_filter = ["template", "vehicle_type"]
    search_fields = ["template__name"]
    readonly_fields = ["created_at"]


@admin.register(MonthYearRate)
class MonthYearRateAdmin(admin.ModelAdmin):
    """包月/包年费率管理"""

    list_display = ["template", "rate_type", "price", "vehicle_type", "is_active", "created_at"]
    list_filter = ["template", "rate_type", "vehicle_type", "is_active"]
    search_fields = ["template__name", "description"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(OvertimeRate)
class OvertimeRateAdmin(admin.ModelAdmin):
    """超时收费管理"""

    list_display = [
        "template",
        "overtime_fee",
        "overtime_start_hours",
        "vehicle_type",
        "is_active",
        "created_at",
    ]
    list_filter = ["template", "vehicle_type", "is_active"]
    search_fields = ["template__name", "description"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ParkingLotPricing)
class ParkingLotPricingAdmin(admin.ModelAdmin):
    """停车场费率配置管理"""

    list_display = ["parking_lot", "charge_type", "template", "created_at"]
    list_filter = ["charge_type", "created_at"]
    search_fields = ["parking_lot__name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    """省份管理"""

    list_display = ["code", "name", "is_special"]
    search_fields = ["code", "name"]


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    """地级市管理"""

    list_display = ["province", "code", "name", "is_capital"]
    list_filter = ["province", "is_capital"]
    search_fields = ["name", "code"]


@admin.register(LicensePlateLocation)
class LicensePlateLocationAdmin(admin.ModelAdmin):
    """车牌号位置映射管理"""

    list_display = ["license_plate_prefix", "province", "city", "created_at"]
    list_filter = ["province", "city", "created_at"]
    search_fields = ["license_plate_prefix", "description"]


@admin.register(WantedVehicle)
class WantedVehicleAdmin(admin.ModelAdmin):
    """通缉车辆管理"""

    list_display = [
        "license_plate",
        "vehicle_type",
        "status",
        "priority",
        "created_at",
        "created_by",
    ]
    list_filter = ["status", "priority", "created_at"]
    search_fields = ["license_plate", "description", "case_number"]
    readonly_fields = ["created_at", "updated_at", "cancelled_at"]


@admin.register(VehicleAlertLog)
class VehicleAlertLogAdmin(admin.ModelAdmin):
    """车辆警报日志管理"""

    list_display = [
        "wanted_vehicle",
        "parking_record",
        "alert_time",
        "is_handled",
        "handled_by",
        "handled_at",
    ]
    list_filter = ["is_handled", "alert_time"]
    search_fields = ["wanted_vehicle__license_plate"]
    readonly_fields = ["alert_time"]
    date_hierarchy = "alert_time"
