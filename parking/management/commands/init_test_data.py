"""
初始化测试数据命令

创建早点喝茶停车场及120个车位，添加示例车辆和VIP员工车辆。
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from parking.models import ParkingLot, ParkingSpace, Vehicle, VIPVehicle


# 广东省各地级市车牌前缀
GUANGDONG_PLATES = {
    "A": "广州",
    "B": "深圳",
    "C": "珠海",
    "D": "汕头",
    "E": "佛山",
    "F": "韶关",
    "G": "湛江",
    "H": "肇庆",
    "J": "江门",
    "K": "茂名",
    "L": "惠州",
    "M": "梅州",
    "N": "汕尾",
    "P": "河源",
    "Q": "阳江",
    "R": "清远",
    "S": "东莞",
    "T": "中山",
    "U": "潮州",
    "V": "揭阳",
    "W": "云浮",
    "X": "顺德",
    "Y": "南海",
    "Z": "港澳入境",
}

# 测试用车牌号（佛山粤E）
TEST_PLATES = [
    # 普通车牌
    "粤E9KM03",
    "粤E8JK52",
    "粤E7HN89",
    "粤E6GT15",
    "粤E5FP46",
    "粤E4DS78",
    "粤E3CQ23",
    "粤E2BW67",
    "粤E1AU91",
    "粤E0ZX34",
    # 新能源车牌（D开头）
    "粤ED12345",
    "粤ED67890",
    "粤ED23456",
    "粤ED78901",
    "粤ED34567",
    # 其他省份车牌
    "粤A12345",
    "粤B67890",
    "京A88888",
    "沪A99999",
    "苏E12345",
]

# 员工免费停车车牌
EMPLOYEE_PLATES = [
    {"plate": "粤E9KM03", "name": "张经理", "dept": "管理部"},
    {"plate": "粤E8JK52", "name": "李主管", "dept": "运营部"},
    {"plate": "粤E7HN89", "name": "王工程师", "dept": "技术部"},
    {"plate": "粤ED12345", "name": "陈总监", "dept": "市场部"},
    {"plate": "粤ED67890", "name": "刘助理", "dept": "行政部"},
]


class Command(BaseCommand):
    help = "初始化测试数据：创建停车场、车位、车辆和用户角色"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="清除现有数据后重新创建",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("正在清除现有数据...")
            self._clear_data()

        self.stdout.write("正在创建用户角色和权限...")
        self._create_roles()

        self.stdout.write("正在创建停车场...")
        parking_lot = self._create_parking_lot()

        self.stdout.write("正在创建车位（120个）...")
        self._create_parking_spaces(parking_lot)

        self.stdout.write("正在创建VIP/员工车辆...")
        self._create_vip_vehicles()

        self.stdout.write("正在创建测试用户...")
        self._create_test_users()

        self.stdout.write(self.style.SUCCESS("测试数据初始化完成！"))
        self._print_summary()

    def _clear_data(self):
        """清除现有测试数据"""
        from parking.models import ParkingRecord

        ParkingRecord.objects.all().delete()
        Vehicle.objects.all().delete()
        VIPVehicle.objects.all().delete()
        ParkingSpace.objects.all().delete()
        ParkingLot.objects.all().delete()

        # 删除测试用户（保留超级管理员）
        User.objects.filter(is_superuser=False).delete()

        self.stdout.write("  已清除现有数据")

    def _create_roles(self):
        """创建用户角色和权限组"""
        # 管理员组（完全权限）
        admin_group, _ = Group.objects.get_or_create(name="管理员")

        # 工作人员组（入场、出场、查询权限）
        staff_group, _ = Group.objects.get_or_create(name="工作人员")

        # 客户组（仅查询自己车辆权限）
        customer_group, _ = Group.objects.get_or_create(name="客户")

        # 分配权限
        parking_ct = ContentType.objects.get(app_label="parking", model="parkingrecord")

        # 管理员：所有权限
        all_perms = Permission.objects.filter(content_type__app_label="parking")
        admin_group.permissions.set(all_perms)

        # 工作人员：增删改查停车记录
        staff_perms = Permission.objects.filter(
            content_type=parking_ct,
            codename__in=["add_parkingrecord", "change_parkingrecord", "view_parkingrecord"],
        )
        staff_group.permissions.set(staff_perms)

        # 客户：仅查看
        view_perm = Permission.objects.filter(
            content_type=parking_ct, codename="view_parkingrecord"
        )
        customer_group.permissions.set(view_perm)

        self.stdout.write("  创建用户组：管理员、工作人员、客户")

    def _create_parking_lot(self) -> ParkingLot:
        """创建早点喝茶停车场"""
        lot, created = ParkingLot.objects.get_or_create(
            name="早点喝茶停车场",
            defaults={
                "address": "广东省佛山市禅城区祖庙路168号",
                "total_spaces": 120,
                "hourly_rate": Decimal("5.00"),
                "is_active": True,
            },
        )

        if not created:
            lot.total_spaces = 120
            lot.save()

        self.stdout.write(f"  停车场：{lot.name}")
        return lot

    def _create_parking_spaces(self, parking_lot: ParkingLot):
        """创建120个车位"""
        # 分区创建车位
        zones = [
            ("A", 40, "standard"),  # A区40个标准车位
            ("B", 40, "standard"),  # B区40个标准车位
            ("C", 20, "large"),  # C区20个大型车位
            ("D", 10, "vip"),  # D区10个VIP车位
            ("E", 5, "disabled"),  # E区5个残疾人车位
            ("F", 5, "standard"),  # F区5个标准车位
        ]

        created_count = 0
        for zone, count, space_type in zones:
            for i in range(1, count + 1):
                space_number = f"{zone}{str(i).zfill(3)}"
                _, created = ParkingSpace.objects.get_or_create(
                    parking_lot=parking_lot,
                    space_number=space_number,
                    defaults={"space_type": space_type},
                )
                if created:
                    created_count += 1

        self.stdout.write(f"  创建车位：{created_count}个")

    def _create_vip_vehicles(self):
        """创建VIP/员工免费停车车辆"""
        today = timezone.now().date()
        admin = User.objects.filter(is_superuser=True).first()

        for emp in EMPLOYEE_PLATES:
            vip, created = VIPVehicle.objects.get_or_create(
                license_plate=emp["plate"],
                defaults={
                    "vip_type": "employee",
                    "owner_name": emp["name"],
                    "department": emp["dept"],
                    "discount_rate": Decimal("1.00"),  # 100%折扣=免费
                    "valid_from": today,
                    "valid_until": None,  # 永久有效
                    "is_active": True,
                    "notes": "公司员工免费停车",
                    "created_by": admin,
                },
            )
            if created:
                self.stdout.write(f"  员工车辆：{emp['plate']} ({emp['name']})")

    def _create_test_users(self):
        """创建测试用户"""
        # 管理员
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@example.com",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("admin123")
            admin.save()
            self.stdout.write("  管理员：admin / admin123")

        # 工作人员
        staff, created = User.objects.get_or_create(
            username="staff",
            defaults={
                "email": "staff@example.com",
                "is_staff": True,
            },
        )
        if created:
            staff.set_password("staff123")
            staff.groups.add(Group.objects.get(name="工作人员"))
            staff.save()
            self.stdout.write("  工作人员：staff / staff123")

        # 客户
        customer, created = User.objects.get_or_create(
            username="customer",
            defaults={
                "email": "customer@example.com",
                "is_staff": False,
            },
        )
        if created:
            customer.set_password("customer123")
            customer.groups.add(Group.objects.get(name="客户"))
            customer.save()
            self.stdout.write("  客户：customer / customer123")

    def _print_summary(self):
        """打印数据统计"""
        self.stdout.write("")
        self.stdout.write("=" * 50)
        self.stdout.write("数据统计：")
        self.stdout.write(f"  停车场数量：{ParkingLot.objects.count()}")
        self.stdout.write(f"  车位数量：{ParkingSpace.objects.count()}")
        self.stdout.write(f"  VIP/员工车辆：{VIPVehicle.objects.count()}")
        self.stdout.write(f"  用户数量：{User.objects.count()}")
        self.stdout.write("=" * 50)
        self.stdout.write("")
        self.stdout.write("登录信息：")
        self.stdout.write("  管理员：admin / admin123")
        self.stdout.write("  工作人员：staff / staff123")
        self.stdout.write("  客户：customer / customer123")
