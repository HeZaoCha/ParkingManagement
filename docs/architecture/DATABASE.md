# 数据库设计文档

## 概述

本系统使用 Django ORM 管理数据库，开发环境使用 SQLite，生产环境建议使用 PostgreSQL。

## E-R 图

```
┌─────────────┐    1:N    ┌──────────────┐    1:N    ┌───────────────┐
│ ParkingLot  │──────────│ ParkingSpace │──────────│ ParkingRecord │
└─────────────┘           └──────────────┘           └───────────────┘
                                                            │
                                                          N:1
                                                            │
                                                    ┌───────────────┐
                                                    │    Vehicle    │
                                                    └───────────────┘
                                                            │
                                                          1:1
                                                            │
                                                    ┌───────────────┐
                                                    │  VIPVehicle   │
                                                    └───────────────┘
```

## 数据表设计

### parking_parkinglot（停车场）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| name | VARCHAR(100) | NOT NULL, UNIQUE | 停车场名称 |
| address | VARCHAR(200) | NOT NULL | 详细地址 |
| lot_type | VARCHAR(20) | NOT NULL, DEFAULT 'outdoor' | 停车场类型 |
| floors | JSON | NULL | 楼层列表（如["B2", "B3", "1F"]） |
| areas | JSON | NULL | 区域信息（如{"B2": ["A区", "B区"]}） |
| total_spaces | INTEGER | NOT NULL, DEFAULT 0 | 总车位数 |
| hourly_rate | DECIMAL(6,2) | NOT NULL, DEFAULT 5.00 | 每小时费率 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 是否启用 |
| created_at | DATETIME | NOT NULL, AUTO | 创建时间 |
| updated_at | DATETIME | NOT NULL, AUTO | 更新时间 |

**停车场类型 (lot_type)**：
- `outdoor` - 露天停车场
- `multi_story` - 立体停车楼
- `street` - 街道停车场
- `underground` - 地下停车场

**索引**：
- `idx_parking_lot_name` (name)
- `idx_parking_lot_active` (is_active)

---

### parking_parkingspace（停车位）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| parking_lot_id | INTEGER | FK, NOT NULL | 所属停车场 |
| floor | VARCHAR(20) | NULL | 所在楼层（如"B2"、"1F"） |
| area | VARCHAR(50) | NULL | 所在区域（如"A区"、"B区"） |
| space_number | VARCHAR(20) | NOT NULL | 车位编号 |
| space_type | VARCHAR(10) | NOT NULL, DEFAULT 'standard' | 车位类型 |
| is_occupied | BOOLEAN | NOT NULL, DEFAULT FALSE | 是否占用 |
| is_reserved | BOOLEAN | NOT NULL, DEFAULT FALSE | 是否预留 |
| created_at | DATETIME | NOT NULL, AUTO | 创建时间 |
| updated_at | DATETIME | NOT NULL, AUTO | 更新时间 |

**车位类型 (space_type)**：
- `standard` - 标准车位
- `vip` - VIP车位
- `large` - 大型车位
- `disabled` - 残疾人车位

**索引**：
- `idx_space_lot_number` (parking_lot_id, space_number) UNIQUE
- `idx_space_available` (is_occupied, is_reserved)

---

### parking_vehicle（车辆）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| license_plate | VARCHAR(10) | NOT NULL, UNIQUE | 车牌号 |
| vehicle_type | VARCHAR(20) | NOT NULL, DEFAULT 'car' | 车辆类型 |
| owner_name | VARCHAR(50) | NULL | 车主姓名 |
| owner_phone | VARCHAR(20) | NULL | 联系电话 |
| created_at | DATETIME | NOT NULL, AUTO | 创建时间 |
| updated_at | DATETIME | NOT NULL, AUTO | 更新时间 |

**车辆类型 (vehicle_type)**：
- `car` - 小型车
- `suv` - SUV
- `truck` - 货车
- `motorcycle` - 摩托车
- `new_energy` - 新能源车

**索引**：
- `idx_vehicle_plate` (license_plate) UNIQUE
- `idx_vehicle_type` (vehicle_type)

---

### parking_vipvehicle（VIP/员工车辆）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| license_plate | VARCHAR(10) | NOT NULL, UNIQUE | 车牌号 |
| owner_name | VARCHAR(100) | NULL | 车主/员工姓名 |
| vip_type | VARCHAR(50) | NOT NULL, DEFAULT '员工车辆' | 特权类型 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 是否启用 |
| created_at | DATETIME | NOT NULL, AUTO | 创建时间 |
| updated_at | DATETIME | NOT NULL, AUTO | 更新时间 |

**特权类型 (vip_type)**：
- `员工车辆` - 公司员工车辆
- `VIP客户` - VIP客户车辆
- `合作伙伴` - 合作伙伴车辆

**索引**：
- `idx_vip_plate` (license_plate) UNIQUE
- `idx_vip_active` (is_active)

---

### parking_parkingrecord（停车记录）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| vehicle_id | INTEGER | FK, NOT NULL | 车辆 |
| parking_space_id | INTEGER | FK, NOT NULL | 停车位 |
| entry_time | DATETIME | NOT NULL | 入场时间 |
| exit_time | DATETIME | NULL | 出场时间 |
| duration_minutes | INTEGER | NULL | 停车时长（分钟） |
| fee | DECIMAL(8,2) | NULL | 停车费用 |
| is_paid | BOOLEAN | NOT NULL, DEFAULT FALSE | 是否已支付 |
| is_free_parking | BOOLEAN | NOT NULL, DEFAULT FALSE | 是否免费停车 |
| discount_rate | DECIMAL(5,2) | NOT NULL, DEFAULT 0.00 | 折扣率 |
| operator | VARCHAR(50) | NULL | 操作员 |
| created_at | DATETIME | NOT NULL, AUTO | 创建时间 |
| updated_at | DATETIME | NOT NULL, AUTO | 更新时间 |

**索引**：
- `idx_record_entry_time` (entry_time)
- `idx_record_exit_time` (exit_time)
- `idx_record_vehicle` (vehicle_id)
- `idx_record_space` (parking_space_id)
- `idx_record_paid` (is_paid)
- `idx_record_active` (exit_time) WHERE exit_time IS NULL

---

## 关联关系

### 一对多关系

```sql
-- 停车场 -> 停车位 (1:N)
ParkingLot.parking_spaces -> ParkingSpace.parking_lot

-- 车辆 -> 停车记录 (1:N)
Vehicle.parking_records -> ParkingRecord.vehicle

-- 停车位 -> 停车记录 (1:N)
ParkingSpace.parking_records -> ParkingRecord.parking_space
```

### 查询优化

```python
# 避免 N+1 查询
ParkingRecord.objects.select_related(
    'vehicle', 'parking_space', 'parking_space__parking_lot'
)

# 批量预加载
ParkingLot.objects.prefetch_related('parking_spaces')

# 只查询需要的字段
Vehicle.objects.only('id', 'license_plate', 'vehicle_type')
```

---

## 数据约束

### 车牌号格式约束

```python
# 正则表达式验证中国车牌号
LICENSE_PLATE_PATTERN = r'^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z]' \
                        r'(([A-HJ-NP-Z0-9]{5})|([DF][A-HJ-NP-Z0-9]{5})|([A-HJ-NP-Z0-9]{4}[DF])' \
                        r'|([A-HJ-NP-Z0-9]{4}[挂学警港澳]))$'
```

### 费用计算规则

```python
def calculate_fee(duration_minutes: int, hourly_rate: Decimal, is_free: bool) -> Decimal:
    """
    费用计算规则：
    1. 前15分钟免费
    2. 超过15分钟按整小时计费
    3. 不满1小时按1小时计算
    4. VIP车辆免费
    """
    if is_free or duration_minutes <= 15:
        return Decimal('0.00')
    
    hours = math.ceil(duration_minutes / 60)
    return Decimal(str(hours)) * hourly_rate
```

### 并发安全

```python
# 使用行级锁防止并发冲突
with transaction.atomic():
    space = ParkingSpace.objects.select_for_update().get(id=space_id)
    if space.is_occupied:
        raise ValueError("车位已被占用")
    space.is_occupied = True
    space.save()
```

---

## 数据迁移

### 创建迁移

```bash
uv run python manage.py makemigrations parking
```

### 执行迁移

```bash
uv run python manage.py migrate
```

### 查看迁移状态

```bash
uv run python manage.py showmigrations
```

### 回滚迁移

```bash
uv run python manage.py migrate parking 0003_previous_migration
```

---

## 数据备份

### SQLite 备份

```bash
# 备份数据库
cp db.sqlite3 db.sqlite3.backup.$(date +%Y%m%d)

# 导出为 JSON
uv run python manage.py dumpdata parking > backup.json
```

### 恢复数据

```bash
# 恢复 JSON 数据
uv run python manage.py loaddata backup.json
```

---

## 性能优化建议

### 1. 索引策略
- 频繁查询的字段添加索引
- 组合查询使用复合索引
- 避免过多索引影响写入性能

### 2. 查询优化
- 使用 `select_related` 避免 N+1 查询
- 使用 `only()` 减少数据传输
- 大数据集使用分页

### 3. 连接池
```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'parking_db',
        'CONN_MAX_AGE': 60,  # 连接池
    }
}
```

### 4. 读写分离（生产环境）
```python
DATABASE_ROUTERS = ['path.to.ParkingRouter']
```

