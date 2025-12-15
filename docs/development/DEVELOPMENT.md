# 开发指南

本文档面向开发人员，介绍如何参与项目开发。

## 开发环境搭建

### 1. 克隆项目

```bash
git clone <repository-url>
cd ParkingManagement
```

### 2. 安装依赖

```bash
# 安装 uv（如果未安装）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 安装所有依赖（包括开发依赖）
uv sync
```

### 3. 初始化数据库

```bash
# 执行迁移
uv run python manage.py migrate

# 创建测试数据
uv run python manage.py init_test_data --clear
```

### 4. 启动开发服务器

**方式 1: 本地开发（推荐）**

```bash
uv run python manage.py runserver 0.0.0.0:8000
```

**方式 2: Docker 开发环境（推荐用于团队协作）**

```bash
# 使用完整开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f web
```

详细文档请参考 [Docker 开发测试环境指南](../deployment/DEVELOPMENT_DOCKER.md)

---

## 项目架构

### 分层架构

```
┌─────────────────────────────────────────┐
│            Presentation Layer           │
│   (Views, Templates, API Endpoints)     │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│             Service Layer               │
│     (Business Logic, Validation)        │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│              Model Layer                │
│      (Django ORM, Data Access)          │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│              Database                   │
│          (SQLite/PostgreSQL)            │
└─────────────────────────────────────────┘
```

### 模块说明

| 模块          | 说明         | 位置                  |
| ------------- | ------------ | --------------------- |
| parking       | 核心业务模块 | `parking/`            |
| common        | 通用工具     | `apps/common/`        |
| audit         | 审计日志     | `apps/audit/`         |
| config        | 系统配置     | `apps/config/`        |
| notifications | 通知服务     | `apps/notifications/` |
| reports       | 报表服务     | `apps/reports/`       |

---

## 静态文件管理

### 组织原则

静态文件按照模板文件的目录结构进行组织：

-   **路径对应**: `templates/admin/pricing/template_edit.html` → `parking/static/admin/pricing/template_edit/`
-   **文件分离**: CSS 和 JavaScript 分别存放在 `css/` 和 `js/` 目录
-   **命名规范**: 页面专用文件使用 `style.css` 和 `script.js`

### 提取内联代码

**原则**: 模板文件中的内联 `<style>` 和 `<script>` 代码应提取到静态文件中。

**步骤**:

1. 在对应的静态文件目录创建 `css/` 和 `js/` 目录
2. 将内联代码提取到对应的静态文件
3. 在模板中使用 `{% static %}` 标签引用

**重要**: 提取时需要注意 Django 模板语法处理：

#### 模板语法处理

静态文件（`.js` 和 `.css`）不会被 Django 模板引擎处理，因此：

1. **CSRF Token**: 使用 `getCsrfToken()` 函数从 DOM 获取

    ```javascript
    // ❌ 错误：静态文件中不能使用模板语法
    'X-CSRFToken': '{{ csrf_token }}'

    // ✅ 正确：从 DOM 获取
    function getCsrfToken() {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) return metaToken.getAttribute('content');
        const formToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (formToken) return formToken.value;
        return '';
    }
    'X-CSRFToken': getCsrfToken()
    ```

2. **URL**: 通过 `data-*` 属性注入

    ```django
    {# 模板中 #}
    <form data-submit-url="{% url 'parking:admin_pricing_template_edit' template.id %}">
    ```

    ```javascript
    // 静态文件中
    const submitUrl = form.dataset.submitUrl;
    ```

3. **变量**: 通过 `data-*` 属性或 JSON 注入
    ```django
    {# 模板中 #}
    <div data-lot-id="{{ parking_lot.id }}"
         data-schedule-data='[{% for s in schedules %}{"id": {{ s.id }}, ...}{% endfor %}]'>
    ```
    ```javascript
    // 静态文件中
    const lotId = parseInt(form.dataset.lotId || "0");
    const scheduleData = JSON.parse(container.dataset.scheduleData || "[]");
    ```

**示例**:

```django
{# 提取前 #}
<style>
  .my-class { color: red; }
</style>
<script>
  fetch('{% url "api:endpoint" %}', {
    headers: { 'X-CSRFToken': '{{ csrf_token }}' }
  });
</script>

{# 提取后 #}
<link rel="stylesheet" href="{% static 'admin/pricing/template_edit/css/style.css' %}">
<script src="{% static 'admin/pricing/template_edit/js/script.js' %}"></script>
<form data-api-url="{% url 'api:endpoint' %}">
  {% csrf_token %}
</form>
```

### 公共工具库

为了减少代码重复，项目提供了公共工具库和公共样式，遵循 **DRY（Don't Repeat Yourself）原则**。

#### JavaScript 工具库

公共工具库位于 `parking/static/common/js/utils.js`，包含以下通用函数：

**CSRF Token 管理**:
- `getCsrfToken()` - 从多种来源获取 CSRF Token（meta 标签、表单字段、Cookie）

**API 请求**:
- `apiRequest(url, options)` - 统一的 API 请求封装，支持自动 CSRF Token、加载状态、Toast 提示

**表单验证**:
- `validateEmail(email)` - 验证邮箱格式
- `validateLicensePlate(plate)` - 验证车牌号格式
- `validateTextLength(text, min, max)` - 验证文本长度
- `showFieldError(fieldName, message)` - 显示字段错误
- `clearFieldError(fieldName)` - 清除字段错误

**模态框管理**:
- `openModal(modalId)` - 打开模态框（带焦点管理、键盘导航）
- `closeModal(modalId)` - 关闭模态框（恢复焦点）

**消息提示**:
- `showToast(message, type, duration)` - 显示 Toast 通知（自动创建容器）
- `removeToast(toast)` - 移除 Toast 通知
- `showSuccess(title, message)` - 显示成功消息（兼容模态框和 Toast）
- `showError(title, message)` - 显示错误消息（兼容模态框和 Toast）

**加载状态**:
- `showLoading()` - 显示加载遮罩（自动创建遮罩）
- `hideLoading()` - 隐藏加载遮罩

**确认对话框**:
- `showConfirm(title, message, callback)` - 显示确认对话框（自动创建对话框）
- `closeConfirmModal()` - 关闭确认对话框

**数据工具**:
- `getDataAttribute(element, attribute, defaultValue)` - 从 data 属性获取 JSON 数据
- `animateNumberToElement(element, targetValue, isCurrency, duration)` - 数字动画效果

**使用方式**:

```javascript
// 在模板中引入（已在 base.html 和 admin/base.html 中引入）
<script src="{% static 'common/js/utils.js' %}"></script>

// 在脚本中使用（通过 window 对象访问）
const token = window.getCsrfToken();
const result = await window.apiRequest('/api/endpoint', {
    method: 'POST',
    data: { key: 'value' },
    showLoading: true,
    showToast: true
});

// 显示 Toast 通知
window.showToast('操作成功', 'success');

// 显示确认对话框
window.showConfirm('确认删除', '此操作无法撤销', () => {
    // 确认后的回调
});
```

#### CSS 组件样式

公共组件样式位于 `parking/static/common/css/components.css`，包含：

- **Toast 通知样式**: `.toast-enter`, `.toast-exit`, 动画关键帧
- **加载状态样式**: `.loading-spinner`, 旋转动画
- **模态框动画样式**: `.modal-enter`, `.modal-exit`, `.backdrop-enter`, `.backdrop-exit`

**使用方式**:

```django
{# 在模板中引入（已在 base.html 和 admin/base.html 中引入） #}
<link rel="stylesheet" href="{% static 'common/css/components.css' %}">
```

#### 代码复用原则

1. **优先使用公共工具库**: 所有通用功能应使用公共工具库中的函数，避免重复定义
2. **页面特定逻辑保留**: 页面特定的业务逻辑保留在各自的脚本文件中
3. **避免重复定义**: 如果发现多个文件中定义了相同的函数，应提取到公共工具库
4. **保持目录结构清晰**: 公共代码放在 `common/` 目录，页面特定代码放在对应的页面目录
5. **统一接口**: 所有公共函数通过 `window` 对象导出，确保全局可用

### 静态文件目录结构

```
parking/static/
├── common/            # 公共工具库
│   └── js/
│       └── utils.js   # 通用工具函数
├── base/              # 基础模板静态文件
│   ├── css/
│   └── js/
├── admin/             # 管理后台静态文件
│   ├── base/
│   └── pricing/
│       └── template_edit/
├── auth/              # 认证页面静态文件
│   └── register/
└── contact/           # 联系页面静态文件
    └── form/
```

详细说明请参考 [架构文档](../architecture/ARCHITECTURE.md#静态文件组织)。

## 代码规范

### Python 代码风格

遵循 PEP 8 和 PEP 257：

```python
from decimal import Decimal
from typing import Optional

from django.db import models


class ParkingService:
    """
    停车服务类

    提供车辆入场、出场、查询等核心业务逻辑。

    Attributes:
        lot: 关联的停车场实例
    """

    def __init__(self, lot: 'ParkingLot') -> None:
        """
        初始化停车服务

        Args:
            lot: 停车场实例
        """
        self.lot = lot

    def calculate_fee(
        self,
        duration_minutes: int,
        *,
        is_vip: bool = False
    ) -> Decimal:
        """
        计算停车费用

        Args:
            duration_minutes: 停车时长（分钟）
            is_vip: 是否VIP车辆

        Returns:
            计算后的费用金额

        Raises:
            ValueError: 当时长为负数时
        """
        if duration_minutes < 0:
            raise ValueError("停车时长不能为负数")

        if is_vip:
            return Decimal('0.00')

        # 前15分钟免费
        if duration_minutes <= 15:
            return Decimal('0.00')

        hours = (duration_minutes + 59) // 60  # 向上取整
        return self.lot.hourly_rate * hours
```

### 命名规范

| 类型      | 规范             | 示例                 |
| --------- | ---------------- | -------------------- |
| 类名      | PascalCase       | `ParkingService`     |
| 函数/方法 | snake_case       | `calculate_fee()`    |
| 变量      | snake_case       | `license_plate`      |
| 常量      | UPPER_SNAKE_CASE | `MAX_PARKING_HOURS`  |
| 私有成员  | 前缀下划线       | `_internal_method()` |

### 类型提示

所有公开方法必须添加类型提示：

```python
def get_vehicle(self, plate: str) -> Optional[Vehicle]:
    """获取车辆信息"""
    return Vehicle.objects.filter(license_plate=plate).first()

def list_records(
    self,
    *,
    limit: int = 20,
    status: str | None = None
) -> list[ParkingRecord]:
    """获取停车记录列表"""
    qs = ParkingRecord.objects.all()
    if status:
        qs = qs.filter(status=status)
    return list(qs[:limit])
```

---

## 服务层设计

### 服务类结构

```python
# parking/services.py

class ParkingLotService:
    """停车场服务"""

    @staticmethod
    def get_active_lots() -> QuerySet[ParkingLot]:
        """获取活跃停车场"""
        return ParkingLot.objects.filter(is_active=True)

    @staticmethod
    def get_lot_with_availability(lot_id: int) -> dict:
        """获取停车场及可用车位"""
        lot = ParkingLot.objects.get(id=lot_id)
        return {
            'id': lot.id,
            'name': lot.name,
            'available': lot.available_spaces,
            'total': lot.total_spaces,
        }


class VehicleService:
    """车辆服务"""

    @staticmethod
    def get_or_create(
        plate: str,
        vehicle_type: str = 'car'
    ) -> tuple[Vehicle, bool]:
        """获取或创建车辆"""
        plate = plate.upper().strip()
        return Vehicle.objects.get_or_create(
            license_plate=plate,
            defaults={'vehicle_type': vehicle_type}
        )


class ParkingRecordService:
    """停车记录服务"""

    @staticmethod
    @transaction.atomic
    def create_entry(
        plate: str,
        lot_id: int,
        *,
        vehicle_type: str = 'car'
    ) -> ParkingRecord:
        """创建入场记录"""
        # 获取或创建车辆
        vehicle, _ = VehicleService.get_or_create(plate, vehicle_type)

        # 检查是否已在场
        if ParkingRecord.objects.filter(
            vehicle=vehicle,
            exit_time__isnull=True
        ).exists():
            raise ValueError("车辆已在场内")

        # 分配车位（加锁防并发）
        space = ParkingSpace.objects.select_for_update().filter(
            parking_lot_id=lot_id,
            is_occupied=False,
            is_reserved=False
        ).first()

        if not space:
            raise ValueError("无可用车位")

        # 创建记录
        record = ParkingRecord.objects.create(
            vehicle=vehicle,
            parking_space=space,
            entry_time=timezone.now()
        )

        # 更新车位状态
        space.is_occupied = True
        space.save(update_fields=['is_occupied'])

        return record
```

### 表单验证

```python
# parking/forms.py

class VehicleEntryForm(forms.Form):
    """车辆入场表单"""

    license_plate = LicensePlateField()
    parking_lot_id = forms.IntegerField()
    vehicle_type = forms.ChoiceField(
        choices=Vehicle.VEHICLE_TYPE_CHOICES,
        initial='car'
    )

    def clean_parking_lot_id(self) -> int:
        lot_id = self.cleaned_data['parking_lot_id']
        try:
            lot = ParkingLot.objects.get(id=lot_id, is_active=True)
            if lot.available_spaces <= 0:
                raise forms.ValidationError("该停车场已满")
        except ParkingLot.DoesNotExist:
            raise forms.ValidationError("停车场不存在")
        return lot_id
```

---

## API 开发

### 装饰器

```python
# parking/api_views.py

def api_response(func):
    """统一API响应格式"""
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        try:
            result = func(request, *args, **kwargs)
            if isinstance(result, JsonResponse):
                return result
            return JsonResponse({
                'success': True,
                'data': result
            })
        except ValidationError as e:
            return JsonResponse({
                'success': False,
                'message': str(e),
                'error_code': 'validation_error'
            }, status=400)
        except Exception as e:
            logger.exception("API error")
            return JsonResponse({
                'success': False,
                'message': '服务器错误',
                'error_code': 'server_error'
            }, status=500)
    return wrapper
```

### 视图示例

```python
@require_http_methods(['POST'])
@login_required
@api_response
def api_vehicle_entry(request):
    """车辆入场API"""
    data = json.loads(request.body)
    form = VehicleEntryForm(data)

    if not form.is_valid():
        return JsonResponse({
            'success': False,
            'message': form.errors.as_text(),
            'error_code': 'invalid_data'
        }, status=400)

    record = ParkingRecordService.create_entry(
        plate=form.cleaned_data['license_plate'],
        lot_id=form.cleaned_data['parking_lot_id'],
        vehicle_type=form.cleaned_data['vehicle_type']
    )

    return {
        'record_id': record.id,
        'space_number': record.parking_space.space_number,
        'entry_time': record.entry_time.isoformat()
    }
```

---

## 测试

### 运行测试

```bash
# 运行所有测试
uv run pytest parking/tests/ -v

# 运行特定测试文件
uv run pytest parking/tests/test_services.py -v

# 运行特定测试
uv run pytest parking/tests/test_services.py::TestParkingRecordService -v

# 查看覆盖率
uv run pytest --cov=parking --cov-report=html parking/tests/
```

### 测试工厂

```python
# parking/tests/conftest.py

import factory
from factory.django import DjangoModelFactory


class ParkingLotFactory(DjangoModelFactory):
    """停车场工厂"""

    class Meta:
        model = ParkingLot

    name = factory.Sequence(lambda n: f'测试停车场{n}')
    address = factory.Faker('address', locale='zh_CN')
    total_spaces = 100
    hourly_rate = Decimal('5.00')
    is_active = True


class VehicleFactory(DjangoModelFactory):
    """车辆工厂"""

    class Meta:
        model = Vehicle

    license_plate = factory.Sequence(lambda n: f'粤A{str(n).zfill(5)}')
    vehicle_type = 'car'


@pytest.fixture
def parking_lot(db):
    """创建测试停车场"""
    return ParkingLotFactory()


@pytest.fixture
def vehicle(db):
    """创建测试车辆"""
    return VehicleFactory()
```

### 测试示例

```python
# parking/tests/test_services.py

class TestParkingRecordService:
    """停车记录服务测试"""

    def test_create_entry_success(self, parking_lot, parking_space):
        """测试入场成功"""
        record = ParkingRecordService.create_entry(
            plate='粤E9KM03',
            lot_id=parking_lot.id
        )

        assert record.vehicle.license_plate == '粤E9KM03'
        assert record.parking_space == parking_space
        assert record.exit_time is None

        parking_space.refresh_from_db()
        assert parking_space.is_occupied

    def test_create_entry_no_space(self, parking_lot):
        """测试无可用车位"""
        with pytest.raises(ValueError, match="无可用车位"):
            ParkingRecordService.create_entry(
                plate='粤E9KM03',
                lot_id=parking_lot.id
            )

    def test_create_entry_already_parked(self, parking_lot, parking_space):
        """测试车辆已在场"""
        ParkingRecordService.create_entry('粤E9KM03', parking_lot.id)

        with pytest.raises(ValueError, match="已在场内"):
            ParkingRecordService.create_entry('粤E9KM03', parking_lot.id)
```

---

## Git 工作流

### 分支策略

| 分支        | 说明                 |
| ----------- | -------------------- |
| `main`      | 生产分支，保持稳定   |
| `develop`   | 开发分支，集成新功能 |
| `feature/*` | 功能分支             |
| `bugfix/*`  | 修复分支             |
| `release/*` | 发布分支             |

### 提交规范

遵循 Conventional Commits：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：

-   `feat`: 新功能
-   `fix`: 修复
-   `docs`: 文档
-   `style`: 格式
-   `refactor`: 重构
-   `test`: 测试
-   `chore`: 构建/工具

示例：

```bash
git commit -m "feat(parking): 添加VIP免费停车功能

- 新增VIPVehicle模型
- 入场时自动识别VIP车辆
- 费用计算考虑折扣率

Closes #123"
```

---

## 调试技巧

### Django Debug Toolbar

```python
# settings.py (开发环境)
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
INTERNAL_IPS = ['127.0.0.1']
```

### 日志

```python
import logging

logger = logging.getLogger(__name__)

def my_function():
    logger.debug("调试信息")
    logger.info("一般信息")
    logger.warning("警告信息")
    logger.error("错误信息")
```

### Django Shell

```bash
# 进入交互式 shell
uv run python manage.py shell_plus

# 常用操作
>>> ParkingLot.objects.all()
>>> Vehicle.objects.filter(license_plate__startswith='粤E')
>>> ParkingRecord.objects.filter(exit_time__isnull=True).count()
```
