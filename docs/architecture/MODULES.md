# 停车场管理系统 - 模块说明文档

## 模块架构总览

系统采用模块化设计，分为核心业务模块和功能扩展模块。

### 模块列表

1. **apps.common** - 通用模块（基础工具）
2. **apps.infrastructure** - 基础设施模块
3. **apps.audit** - 审计日志模块
4. **apps.config** - 系统配置模块
5. **apps.notifications** - 通知系统模块
6. **apps.reports** - 报表统计模块
7. **parking** - 核心业务模块

## 模块详细说明

### 1. apps.common - 通用模块

**职责**: 提供通用工具、基类、装饰器等

**主要功能**:
- **models.py**: 通用模型基类
  - `TimestampMixin`: 时间戳混入类
  - `SoftDeleteMixin`: 软删除混入类
  - `BaseModel`: 基础模型类
- **utils.py**: 工具函数
  - 货币格式化
  - 时长格式化
  - 车牌号/手机号验证
  - 文件大小处理
  - 日期范围计算
- **decorators.py**: 装饰器
  - `timing_decorator`: 性能计时
  - `cache_result`: 结果缓存
  - `require_ajax`: AJAX请求验证
  - `handle_exceptions`: 异常处理
- **exceptions.py**: 自定义异常
  - `BusinessLogicError`: 业务逻辑错误
  - `ValidationError`: 验证错误
  - `NotFoundError`: 资源未找到
  - `PermissionDeniedError`: 权限不足
- **validators.py**: 自定义验证器
  - `LicensePlateValidator`: 车牌号验证器
  - `PhoneValidator`: 手机号验证器

**使用示例**:
```python
from apps.common.models import TimestampMixin
from apps.common.utils import format_currency, validate_license_plate
from apps.common.decorators import cache_result

# 使用时间戳混入
class MyModel(TimestampMixin, models.Model):
    name = models.CharField(max_length=100)

# 使用工具函数
amount = format_currency(Decimal('123.45'))  # '¥123.45'
is_valid = validate_license_plate('京A12345')  # True

# 使用装饰器
@cache_result(timeout=600)
def expensive_function():
    return compute_result()
```

### 2. apps.infrastructure - 基础设施模块

**职责**: 提供系统级基础设施支持

**主要功能**:
- **middleware.py**: 自定义中间件
  - `RequestLoggingMiddleware`: 请求日志记录
  - `PerformanceMonitoringMiddleware`: 性能监控
- **signals.py**: 信号处理器
  - 模型保存/删除日志记录

**使用示例**:
中间件已自动注册到settings.py，无需手动使用。

### 3. apps.audit - 审计日志模块

**职责**: 记录系统操作日志，满足审计要求

**主要功能**:
- **models.py**: 审计日志模型
  - `AuditLog`: 记录操作日志
- **services.py**: 审计服务
  - `AuditService.log_action()`: 记录操作
  - `AuditService.log_model_create()`: 记录创建
  - `AuditService.log_model_update()`: 记录更新
  - `AuditService.log_model_delete()`: 记录删除
- **middleware.py**: 审计中间件
  - 自动记录登录/登出操作

**使用示例**:
```python
from apps.audit.services import AuditService

# 记录操作
AuditService.log_action(
    action='create',
    model_name='ParkingLot',
    user=request.user,
    object_id=lot.id,
    description='创建停车场',
    request=request
)

# 记录模型创建
AuditService.log_model_create(
    instance=parking_lot,
    user=request.user,
    request=request
)
```

### 4. apps.config - 系统配置模块

**职责**: 管理系统配置参数

**主要功能**:
- **models.py**: 配置模型
  - `SystemConfig`: 系统配置存储
- **services.py**: 配置服务
  - `ConfigService.get()`: 获取配置
  - `ConfigService.set()`: 设置配置
  - `ConfigService.get_group()`: 获取分组配置
  - `ConfigService.get_public_configs()`: 获取公开配置

**使用示例**:
```python
from apps.config.services import ConfigService

# 设置配置
ConfigService.set(
    key='parking_rate',
    value=5.00,
    config_type='float',
    group='parking',
    description='停车费率'
)

# 获取配置
rate = ConfigService.get('parking_rate', default=5.00)

# 获取分组配置
parking_configs = ConfigService.get_group('parking')
```

### 5. apps.notifications - 通知系统模块

**职责**: 系统消息通知

**主要功能**:
- **models.py**: 通知模型
  - `Notification`: 通知消息
  - `NotificationTemplate`: 通知模板
- **services.py**: 通知服务
  - `NotificationService.create_notification()`: 创建通知
  - `NotificationService.create_from_template()`: 从模板创建
  - `NotificationService.get_unread_count()`: 获取未读数量
  - `NotificationService.mark_all_as_read()`: 标记已读

**使用示例**:
```python
from apps.notifications.services import NotificationService

# 创建通知
NotificationService.create_notification(
    user=user,
    title='停车提醒',
    message='您的车辆即将超时',
    notification_type='warning'
)

# 从模板创建
NotificationService.create_from_template(
    user=user,
    template_name='parking_reminder',
    context={'plate': '京A12345', 'time': '2小时'}
)

# 获取未读数量
count = NotificationService.get_unread_count(user)
```

### 6. apps.reports - 报表统计模块

**职责**: 数据统计和报表生成

**主要功能**:
- **services.py**: 报表服务
  - `ReportService.get_daily_stats()`: 每日统计
  - `ReportService.get_range_stats()`: 日期范围统计
  - `ReportService.get_parking_lot_stats()`: 停车场统计
  - `ReportService.get_chart_data()`: 图表数据

**使用示例**:
```python
from apps.reports.services import ReportService

# 获取每日统计
stats = ReportService.get_daily_stats()
print(f"今日收入: {stats['revenue']}")

# 获取停车场统计
lot_stats = ReportService.get_parking_lot_stats()
for lot in lot_stats['parking_lots']:
    print(f"{lot['name']}: 占用率 {lot['occupancy_rate']}%")

# 获取图表数据
chart_data = ReportService.get_chart_data(days=7)
# 返回: {'labels': [...], 'counts': [...], 'revenues': [...]}
```

## 模块依赖关系

```
parking (核心业务)
  ├── apps.common (通用工具)
  ├── apps.infrastructure (基础设施)
  └── apps.audit (审计日志)

apps.reports (报表统计)
  ├── parking (业务数据)
  └── apps.common (通用工具)

apps.notifications (通知系统)
  ├── parking (业务事件)
  └── apps.common (通用工具)

apps.config (系统配置)
  └── apps.common (通用工具)
```

## 模块集成

所有模块已集成到 `settings.py`:

```python
INSTALLED_APPS = [
    # Django内置应用
    ...
    # 通用模块（必须最先加载）
    'apps.common',
    'apps.infrastructure',
    # 核心业务模块
    'parking',
    # 功能扩展模块
    'apps.audit',
    'apps.config',
    'apps.notifications',
    'apps.reports',
]

MIDDLEWARE = [
    # Django内置中间件
    ...
    # 自定义中间件
    'apps.infrastructure.middleware.RequestLoggingMiddleware',
    'apps.infrastructure.middleware.PerformanceMonitoringMiddleware',
    'apps.audit.middleware.AuditLogMiddleware',
]
```

## 测试

运行模块测试脚本：

```bash
uv run python scripts/tests/test_modules.py
```

测试覆盖：
- ✅ 通用模块工具函数
- ✅ 审计日志创建和查询
- ✅ 系统配置设置和获取
- ✅ 通知创建和管理
- ✅ 报表统计功能

## 扩展指南

### 添加新模块

1. 在 `apps/` 目录下创建新应用
2. 实现模块功能（models、services等）
3. 在 `settings.py` 中注册应用
4. 创建数据库迁移
5. 编写测试用例

### 模块开发规范

1. **模型**: 继承 `apps.common.models.BaseModel` 或使用 Mixin
2. **服务**: 将业务逻辑封装在 Service 类中
3. **异常**: 使用 `apps.common.exceptions` 中的异常类
4. **验证**: 使用 `apps.common.validators` 中的验证器
5. **日志**: 使用 `apps.audit.services` 记录重要操作

## 性能优化

- **缓存**: 配置模块使用 Django Cache Framework
- **索引**: 所有模型的关键字段都添加了数据库索引
- **查询优化**: 使用 `select_related` 和 `only()` 优化查询
- **批量操作**: 支持批量查询和更新

## 安全性

- **审计追踪**: 所有重要操作都记录审计日志
- **权限控制**: 使用 Django 权限系统
- **数据验证**: 模型字段和业务逻辑验证
- **SQL注入防护**: 使用 Django ORM

