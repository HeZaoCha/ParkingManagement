"""
初始化默认费率模板命令

创建系统默认的费率模板，方便用户快速使用。

Author: HeZaoCha
Created: 2025-12-15
Version: 1.0.0
"""

from decimal import Decimal

from django.core.management.base import BaseCommand

from parking.pricing_models import MonthYearRate, OvertimeRate, PricingRule, PricingTemplate


class Command(BaseCommand):
    help = "初始化默认费率模板"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="强制重新创建（如果模板已存在则删除后重建）",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)

        # 默认模板配置
        default_templates = [
            {
                "name": "标准阶梯收费",
                "description": "标准停车场阶梯收费模板，适用于大多数停车场",
                "free_minutes": 15,
                "daily_max_fee": Decimal("100.00"),
                "rules": [
                    {"start_minutes": 0, "end_minutes": 60, "rate_per_hour": Decimal("5.00"), "vehicle_type": "all"},
                    {"start_minutes": 60, "end_minutes": 120, "rate_per_hour": Decimal("8.00"), "vehicle_type": "all"},
                    {"start_minutes": 120, "end_minutes": None, "rate_per_hour": Decimal("10.00"), "vehicle_type": "all"},
                ],
                "month_year_rates": [
                    {"rate_type": "month", "price": Decimal("300.00"), "vehicle_type": "all", "description": "包月优惠"},
                    {"rate_type": "quarter", "price": Decimal("800.00"), "vehicle_type": "all", "description": "包季优惠"},
                    {"rate_type": "year", "price": Decimal("2800.00"), "vehicle_type": "all", "description": "包年优惠"},
                ],
                "overtime_rates": [
                    {"overtime_fee": Decimal("15.00"), "overtime_start_hours": 24, "vehicle_type": "all", "description": "超过24小时后的超时费用"},
                ],
            },
            {
                "name": "优惠收费模板",
                "description": "适用于优惠活动期间的停车场",
                "free_minutes": 30,
                "daily_max_fee": Decimal("80.00"),
                "rules": [
                    {"start_minutes": 0, "end_minutes": 120, "rate_per_hour": Decimal("4.00"), "vehicle_type": "all"},
                    {"start_minutes": 120, "end_minutes": None, "rate_per_hour": Decimal("6.00"), "vehicle_type": "all"},
                ],
                "month_year_rates": [
                    {"rate_type": "month", "price": Decimal("250.00"), "vehicle_type": "all", "description": "优惠包月"},
                ],
                "overtime_rates": [],
            },
            {
                "name": "VIP专用费率",
                "description": "适用于VIP车位的专用费率模板",
                "free_minutes": 30,
                "daily_max_fee": Decimal("150.00"),
                "rules": [
                    {"start_minutes": 0, "end_minutes": 60, "rate_per_hour": Decimal("8.00"), "vehicle_type": "vip"},
                    {"start_minutes": 60, "end_minutes": None, "rate_per_hour": Decimal("12.00"), "vehicle_type": "vip"},
                ],
                "month_year_rates": [
                    {"rate_type": "month", "price": Decimal("500.00"), "vehicle_type": "vip", "description": "VIP包月"},
                    {"rate_type": "year", "price": Decimal("5000.00"), "vehicle_type": "vip", "description": "VIP包年"},
                ],
                "overtime_rates": [
                    {"overtime_fee": Decimal("20.00"), "overtime_start_hours": 24, "vehicle_type": "vip", "description": "VIP超时费用"},
                ],
            },
        ]

        created_count = 0
        skipped_count = 0

        for template_data in default_templates:
            template_name = template_data["name"]

            # 检查模板是否已存在
            existing_template = PricingTemplate.objects.filter(name=template_name).first()

            if existing_template:
                if force:
                    self.stdout.write(f"删除已存在的模板: {template_name}")
                    existing_template.delete()
                else:
                    self.stdout.write(
                        self.style.WARNING(f"模板 '{template_name}' 已存在，跳过（使用 --force 强制重新创建）")
                    )
                    skipped_count += 1
                    continue

            # 创建模板
            template = PricingTemplate.objects.create(
                name=template_name,
                description=template_data["description"],
                free_minutes=template_data["free_minutes"],
                daily_max_fee=template_data.get("daily_max_fee"),
                is_active=True,
            )

            # 创建费率规则
            for idx, rule_data in enumerate(template_data.get("rules", [])):
                PricingRule.objects.create(
                    template=template,
                    start_minutes=rule_data["start_minutes"],
                    end_minutes=rule_data.get("end_minutes"),
                    rate_per_hour=rule_data["rate_per_hour"],
                    vehicle_type=rule_data.get("vehicle_type", "all"),
                    order=idx,
                )

            # 创建包月/包年费率
            for rate_data in template_data.get("month_year_rates", []):
                MonthYearRate.objects.create(
                    template=template,
                    rate_type=rate_data["rate_type"],
                    price=rate_data["price"],
                    vehicle_type=rate_data.get("vehicle_type", "all"),
                    description=rate_data.get("description", ""),
                    is_active=True,
                )

            # 创建超时收费
            for overtime_data in template_data.get("overtime_rates", []):
                OvertimeRate.objects.create(
                    template=template,
                    overtime_fee=overtime_data["overtime_fee"],
                    overtime_start_hours=overtime_data.get("overtime_start_hours", 24),
                    vehicle_type=overtime_data.get("vehicle_type", "all"),
                    description=overtime_data.get("description", ""),
                    is_active=True,
                )

            created_count += 1
            self.stdout.write(self.style.SUCCESS(f"✓ 创建模板: {template_name}"))

        # 输出统计
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("初始化完成！"))
        self.stdout.write(f"创建: {created_count} 个模板")
        if skipped_count > 0:
            self.stdout.write(f"跳过: {skipped_count} 个模板（已存在）")
        self.stdout.write(f"总计: {PricingTemplate.objects.count()} 个模板")
