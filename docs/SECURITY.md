# 安全文档

本文档描述系统的安全措施和最佳实践。

## 安全架构

### 认证与授权

| 机制 | 实现 | 说明 |
|------|------|------|
| 用户认证 | Django Auth | Session-based 认证 |
| 权限控制 | Django Groups | 基于角色的权限 |
| 密码存储 | PBKDF2_SHA256 | 加盐哈希 |
| 会话管理 | Django Session | 服务端 Session |

### 用户角色权限

| 功能 | Admin | Staff | Customer |
|------|-------|-------|----------|
| 系统配置 | ✅ | ❌ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ |
| 停车场管理 | ✅ | ✅ | ❌ |
| 入场/出场 | ✅ | ✅ | ❌ |
| 车辆查询 | ✅ | ✅ | ✅ |

---

## 数据安全

### SQL 注入防护

使用 Django ORM 参数化查询：

```python
# ✅ 安全的写法
Vehicle.objects.filter(license_plate=user_input)

# ❌ 危险的写法（永远不要这样做）
Vehicle.objects.raw(f"SELECT * FROM vehicle WHERE plate='{user_input}'")
```

### XSS 防护

Django 模板自动转义：

```html
<!-- ✅ 自动转义 -->
{{ user_input }}

<!-- ⚠️ 需谨慎使用 -->
{{ user_input|safe }}
```

### CSRF 防护

所有 POST 请求需包含 CSRF Token：

```html
<form method="post">
    {% csrf_token %}
    ...
</form>
```

API 请求需在 Header 中包含：
```javascript
headers: {
    'X-CSRFToken': getCsrfToken()
}
```

---

## 输入验证

### 车牌号验证

```python
LICENSE_PLATE_PATTERN = r'^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z]...$'

def validate_license_plate(value: str) -> None:
    if not re.match(LICENSE_PLATE_PATTERN, value):
        raise ValidationError('无效的车牌号格式')
```

### 表单验证层

```python
class VehicleEntryForm(forms.Form):
    license_plate = LicensePlateField()  # 自定义字段验证
    parking_lot_id = forms.IntegerField()
    
    def clean_parking_lot_id(self):
        lot_id = self.cleaned_data['parking_lot_id']
        if not ParkingLot.objects.filter(id=lot_id, is_active=True).exists():
            raise ValidationError('停车场不存在')
        return lot_id
```

### 密码强度要求

系统使用评分系统评估密码强度，要求至少达到中级强度（50分以上）：

**评分标准：**
- **长度**：≤4字符(5分), 5-7字符(10分), ≥8字符(25分)
- **字母**：无(0分), 单一大小写(10分), 大小写混合(20分)
- **数字**：无(0分), 1个(10分), 多个(20分)
- **符号**：无(0分), 1个(10分), 多个(25分)
- **奖励**：字母+数字(2分), 字母+数字+符号(3分), 大小写+数字+符号(5分)

**强度等级：**
- 0-24分：非常弱 ❌
- 25-49分：弱 ❌
- 50-59分：中 ✅（最低要求）
- 60-69分：强 ✅
- 70-79分：非常强 ✅
- 80-89分：安全 ✅
- 90+分：非常安全 ✅

**示例：**
- `password123` (50分) - 中级 ✅
- `Password123` (62分) - 强 ✅
- `Password123!` (75分) - 非常强 ✅
- `abc123` (22分) - 非常弱 ❌

### 邮箱验证

系统对邮箱输入进行格式验证和智能补全：

**支持的常见邮箱后缀：**
- 国内：qq.com, 163.com, 126.com, sina.com, gmail.com等
- 国际：gmail.com, outlook.com, hotmail.com, yahoo.com等

**验证规则：**
- 实时格式验证：`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
- 智能后缀补全：输入@后自动提示匹配的后缀
- 键盘导航：支持方向键选择，Enter确认

### 模型验证层

```python
class Vehicle(models.Model):
    license_plate = models.CharField(
        validators=[license_plate_validator]
    )
    
    def clean(self):
        validate_license_plate(self.license_plate)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
```

---

## 并发安全

### 数据库锁

使用 `select_for_update()` 防止并发冲突：

```python
from django.db import transaction

@transaction.atomic
def create_entry(plate: str, lot_id: int):
    # 行级锁定车位
    space = ParkingSpace.objects.select_for_update().filter(
        parking_lot_id=lot_id,
        is_occupied=False
    ).first()
    
    if not space:
        raise ValueError("无可用车位")
    
    space.is_occupied = True
    space.save()
```

### 事务保证

```python
from django.db import transaction

@transaction.atomic
def create_exit(record_id: int):
    record = ParkingRecord.objects.select_for_update().get(id=record_id)
    
    if record.exit_time:
        raise ValueError("已出场")
    
    record.exit_time = timezone.now()
    record.calculate_fee()
    record.save()
    
    record.parking_space.is_occupied = False
    record.parking_space.save()
```

---

## 生产环境配置

### settings.py 安全设置

```python
# 生产环境必须设置
DEBUG = False
SECRET_KEY = os.environ['SECRET_KEY']  # 从环境变量读取
ALLOWED_HOSTS = ['your-domain.com']

# 安全 Cookie
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True

# HSTS
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# 其他安全设置
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

### HTTPS 配置

生产环境必须启用 HTTPS：

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
}
```

---

## 日志与审计

### 访问日志

```python
# middleware.py
class AuditLogMiddleware:
    def __call__(self, request):
        response = self.get_response(request)
        
        if request.user.is_authenticated:
            AuditLog.objects.create(
                user=request.user,
                action=request.method,
                path=request.path,
                ip_address=get_client_ip(request)
            )
        
        return response
```

### 敏感操作日志

```python
import logging

logger = logging.getLogger('parking.audit')

def create_exit(record_id, operator):
    record = ParkingRecord.objects.get(id=record_id)
    record.process_exit()
    
    logger.info(
        f"车辆出场 - 车牌: {record.vehicle.license_plate}, "
        f"费用: {record.fee}, 操作员: {operator}"
    )
```

---

## 安全检查清单

### 部署前检查

- [ ] `DEBUG = False`
- [ ] `SECRET_KEY` 使用安全的随机值
- [ ] `ALLOWED_HOSTS` 已正确配置
- [ ] 已启用 HTTPS
- [ ] CSRF 保护已启用
- [ ] 数据库密码已更改
- [ ] 静态文件由 Nginx 服务
- [ ] 日志已配置
- [ ] 备份策略已实施

### 定期检查

- [ ] 检查依赖安全更新
- [ ] 审查访问日志
- [ ] 测试备份恢复
- [ ] 更新 SSL 证书

---

## 漏洞报告

如果您发现安全漏洞，请：

1. **不要**在公开 Issue 中报告
2. 发送邮件至 security@example.com
3. 包含漏洞详情和复现步骤
4. 我们将在 48 小时内回复

感谢您帮助保护系统安全！

