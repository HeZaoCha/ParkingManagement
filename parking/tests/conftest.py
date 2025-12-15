"""
Pytest 配置和测试工厂

提供测试所需的 fixtures 和工厂类。
使用 factory_boy 创建测试数据，确保测试隔离性。
"""

from decimal import Decimal

import factory
import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from parking.models import ParkingLot, ParkingRecord, ParkingSpace, Vehicle


# ==================== 工厂类 ====================


class UserFactory(factory.django.DjangoModelFactory):
    """用户工厂"""

    class Meta:
        model = User
        django_get_or_create = ("username",)

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")
    is_active = True


class StaffUserFactory(UserFactory):
    """员工用户工厂"""

    is_staff = True


class ParkingLotFactory(factory.django.DjangoModelFactory):
    """停车场工厂"""

    class Meta:
        model = ParkingLot

    name = factory.Sequence(lambda n: f"测试停车场{n}")
    address = factory.Faker("address", locale="zh_CN")
    total_spaces = 100
    hourly_rate = Decimal("5.00")
    is_active = True


class ParkingSpaceFactory(factory.django.DjangoModelFactory):
    """停车位工厂"""

    class Meta:
        model = ParkingSpace

    parking_lot = factory.SubFactory(ParkingLotFactory)
    space_number = factory.Sequence(lambda n: f"A{str(n).zfill(3)}")
    space_type = "standard"
    is_occupied = False
    is_reserved = False


class VehicleFactory(factory.django.DjangoModelFactory):
    """车辆工厂"""

    class Meta:
        model = Vehicle
        django_get_or_create = ("license_plate",)

    # 生成符合中国车牌规则的车牌号（粤E佛山）
    license_plate = factory.Sequence(lambda n: f"粤E{str(n).zfill(5)}")
    vehicle_type = "car"
    owner_name = factory.Faker("name", locale="zh_CN")
    owner_phone = factory.Sequence(lambda n: f"1380000{str(n).zfill(4)}")


class ParkingRecordFactory(factory.django.DjangoModelFactory):
    """停车记录工厂"""

    class Meta:
        model = ParkingRecord

    vehicle = factory.SubFactory(VehicleFactory)
    parking_space = factory.SubFactory(ParkingSpaceFactory)
    entry_time = factory.LazyFunction(timezone.now)
    exit_time = None
    fee = None
    is_paid = False


class CompletedParkingRecordFactory(ParkingRecordFactory):
    """已完成停车记录工厂"""

    exit_time = factory.LazyAttribute(lambda obj: obj.entry_time + timezone.timedelta(hours=2))
    fee = Decimal("10.00")
    duration_minutes = 120


# ==================== Fixtures ====================


@pytest.fixture
def user(db) -> User:
    """创建普通用户"""
    return UserFactory()


@pytest.fixture
def staff_user(db) -> User:
    """创建员工用户"""
    return StaffUserFactory()


@pytest.fixture
def admin_user(db) -> User:
    """创建管理员用户"""
    return UserFactory(is_staff=True, is_superuser=True)


@pytest.fixture
def parking_lot(db) -> ParkingLot:
    """创建测试停车场"""
    return ParkingLotFactory()


@pytest.fixture
def parking_lot_with_spaces(db) -> ParkingLot:
    """创建带车位的测试停车场"""
    lot = ParkingLotFactory(total_spaces=10)
    # 创建10个车位
    for i in range(10):
        ParkingSpaceFactory(parking_lot=lot, space_number=f"A{str(i + 1).zfill(3)}")
    return lot


@pytest.fixture
def parking_space(db, parking_lot) -> ParkingSpace:
    """创建测试车位"""
    return ParkingSpaceFactory(parking_lot=parking_lot)


@pytest.fixture
def available_space(db, parking_lot) -> ParkingSpace:
    """创建可用车位"""
    return ParkingSpaceFactory(parking_lot=parking_lot, is_occupied=False, is_reserved=False)


@pytest.fixture
def occupied_space(db, parking_lot) -> ParkingSpace:
    """创建已占用车位"""
    return ParkingSpaceFactory(parking_lot=parking_lot, is_occupied=True)


@pytest.fixture
def vehicle(db) -> Vehicle:
    """创建测试车辆"""
    return VehicleFactory()


@pytest.fixture
def active_parking_record(db, vehicle, available_space) -> ParkingRecord:
    """创建在场停车记录"""
    # 标记车位为已占用
    available_space.is_occupied = True
    available_space.save()

    return ParkingRecordFactory(vehicle=vehicle, parking_space=available_space, exit_time=None)


@pytest.fixture
def completed_parking_record(db) -> ParkingRecord:
    """创建已完成停车记录"""
    return CompletedParkingRecordFactory()


@pytest.fixture
def multiple_parking_lots(db) -> list[ParkingLot]:
    """创建多个停车场"""
    lots = []
    for i in range(3):
        lot = ParkingLotFactory(name=f"停车场{i + 1}")
        # 每个停车场创建5个车位
        for j in range(5):
            ParkingSpaceFactory(parking_lot=lot, space_number=f"{chr(65 + i)}{str(j + 1).zfill(3)}")
        lots.append(lot)
    return lots


@pytest.fixture
def authenticated_client(client, user):
    """已认证的测试客户端"""
    client.force_login(user)
    return client


@pytest.fixture
def staff_client(client, staff_user):
    """员工用户的测试客户端"""
    client.force_login(staff_user)
    return client
