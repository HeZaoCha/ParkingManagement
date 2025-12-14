# API 接口文档

停车场管理系统 RESTful API 文档

## 概述

### 基础信息

| 项目 | 说明 |
|------|------|
| 基础URL | `http://localhost:8000/parking/api/` |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 认证方式 | Django Session（部分接口需登录） |

### 响应格式

所有API响应统一格式：

```json
{
    "success": true,
    "message": "操作成功",
    "data": { ... },
    "error_code": ""
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| message | string | 提示消息 |
| data | object/array | 返回数据（成功时） |
| error_code | string | 错误代码（失败时） |

### 错误代码

| 代码 | 说明 |
|------|------|
| `invalid_license_plate` | 车牌号格式不正确 |
| `vehicle_already_parked` | 车辆已在场内 |
| `lot_not_found` | 停车场不存在 |
| `no_available_space` | 无可用车位 |
| `no_active_record` | 无在场记录 |
| `already_exited` | 车辆已出场 |
| `missing_identifier` | 缺少必要参数 |
| `server_error` | 服务器错误 |

---

## 车辆入场

### POST /api/entry/

处理车辆入场，自动分配车位。

**需要登录**：是

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| license_plate | string | 是 | 车牌号（如：粤E9KM03） |
| parking_lot_id | integer | 是 | 停车场ID |
| vehicle_type | string | 否 | 车辆类型（默认：car） |

车辆类型可选值：
- `car` - 小型车
- `suv` - SUV
- `truck` - 货车
- `motorcycle` - 摩托车
- `new_energy` - 新能源车

#### 请求示例

```bash
curl -X POST http://localhost:8000/parking/api/entry/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{
    "license_plate": "粤E9KM03",
    "parking_lot_id": 1,
    "vehicle_type": "car"
  }'
```

#### 成功响应

```json
{
    "success": true,
    "message": "入场成功，车位号: A001",
    "data": {
        "license_plate": "粤E9KM03",
        "parking_lot": "早点喝茶停车场",
        "space_number": "A001",
        "entry_time": "2024-12-11 10:30:00",
        "record_id": 123
    }
}
```

#### 失败响应

```json
{
    "success": false,
    "message": "车辆已在 早点喝茶停车场 停车",
    "error_code": "vehicle_already_parked"
}
```

---

## 车辆出场

### POST /api/exit/

处理车辆出场，计算费用并释放车位。

**需要登录**：是

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| license_plate | string | 二选一 | 车牌号 |
| record_id | integer | 二选一 | 停车记录ID |
| auto_pay | boolean | 否 | 是否自动标记已支付 |

#### 请求示例

```bash
# 通过车牌号出场
curl -X POST http://localhost:8000/parking/api/exit/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{
    "license_plate": "粤E9KM03",
    "auto_pay": true
  }'

# 通过记录ID出场
curl -X POST http://localhost:8000/parking/api/exit/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{
    "record_id": 123,
    "auto_pay": false
  }'
```

#### 成功响应

```json
{
    "success": true,
    "message": "出场成功，停车费用: ¥15.00",
    "data": {
        "license_plate": "粤E9KM03",
        "fee": "15.00",
        "duration_minutes": 180,
        "entry_time": "2024-12-11 07:30",
        "exit_time": "2024-12-11 10:30",
        "is_paid": true
    }
}
```

#### VIP/员工免费出场

```json
{
    "success": true,
    "message": "出场成功，停车费用: ¥0.00",
    "data": {
        "license_plate": "粤E9KM03",
        "fee": "0.00",
        "duration_minutes": 180,
        "entry_time": "2024-12-11 07:30",
        "exit_time": "2024-12-11 10:30",
        "is_paid": true
    }
}
```

---

## 车辆查询

### GET /api/query/

查询车辆停车状态。

**需要登录**：否（公开接口）

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| license_plate | string | 是 | 车牌号 |

#### 请求示例

```bash
curl "http://localhost:8000/parking/api/query/?license_plate=粤E9KM03"
```

#### 在场车辆响应

```json
{
    "success": true,
    "message": "查询成功",
    "data": {
        "found": true,
        "is_parked": true,
        "license_plate": "粤E9KM03",
        "parking_lot": "早点喝茶停车场",
        "space_number": "A001",
        "entry_time": "2024-12-11 07:30",
        "duration_minutes": 180,
        "current_fee": "15.00",
        "record_id": 123,
        "is_vip": true,
        "vip_type": "员工车辆"
    }
}
```

#### 不在场车辆响应

```json
{
    "success": true,
    "message": "查询成功",
    "data": {
        "found": true,
        "is_parked": false,
        "license_plate": "粤E9KM03",
        "vehicle_type": "小型车",
        "last_visit": "2024-12-10 18:30",
        "last_lot": "早点喝茶停车场",
        "is_vip": true,
        "vip_type": "员工车辆"
    }
}
```

#### 未找到车辆响应

```json
{
    "success": true,
    "message": "未找到该车辆",
    "data": {
        "found": false,
        "is_parked": false,
        "license_plate": "粤E99999",
        "message": "未找到该车辆信息",
        "is_vip": false
    }
}
```

---

## 停车记录搜索

### GET /api/search/

搜索停车记录，支持多条件筛选。

**需要登录**：是

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| license_plate | string | 否 | 车牌号（模糊搜索） |
| status | string | 否 | 状态筛选 |
| limit | integer | 否 | 返回数量（默认20，最大100） |

状态可选值：
- `active` - 在场
- `exited` - 已出场
- `unpaid` - 未支付
- `paid` - 已支付

#### 请求示例

```bash
curl "http://localhost:8000/parking/api/search/?license_plate=粤E&status=active&limit=10"
```

#### 响应示例

```json
{
    "success": true,
    "data": {
        "records": [
            {
                "id": 123,
                "license_plate": "粤E9KM03",
                "vehicle_type": "小型车",
                "parking_lot": "早点喝茶停车场",
                "space_number": "A001",
                "entry_time": "2024-12-11 07:30",
                "exit_time": null,
                "fee": null,
                "is_paid": false,
                "is_active": true
            }
        ],
        "total_count": 1,
        "has_more": false
    }
}
```

---

## 统计数据

### GET /api/stats/

获取停车场实时统计数据。

**需要登录**：否（公开接口）

#### 请求示例

```bash
curl "http://localhost:8000/parking/api/stats/"
```

#### 响应示例

```json
{
    "success": true,
    "data": {
        "total_lots": 1,
        "total_spaces": 120,
        "occupied_spaces": 35,
        "available_spaces": 85,
        "today_count": 48,
        "today_revenue": "380.00",
        "active_count": 35,
        "parking_lots": [
            {
                "id": 1,
                "name": "早点喝茶停车场",
                "address": "广东省佛山市禅城区祖庙路168号",
                "total_spaces": 120,
                "occupied_spaces": 35,
                "available_spaces": 85,
                "hourly_rate": "5.00"
            }
        ],
        "recent_records": [
            {
                "id": 123,
                "license_plate": "粤E9KM03",
                "parking_lot": "早点喝茶停车场",
                "space_number": "A001",
                "entry_time": "10:30",
                "exit_time": null,
                "fee": null,
                "is_paid": false,
                "is_active": true
            }
        ]
    }
}
```

---

## 停车场列表

### GET /api/lots/

获取有可用车位的停车场列表。

**需要登录**：是

#### 请求示例

```bash
curl "http://localhost:8000/parking/api/lots/"
```

#### 响应示例

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "早点喝茶停车场",
            "available_spaces": 85,
            "total_spaces": 120,
            "hourly_rate": "5.00"
        }
    ]
}
```

---

## 车牌验证

### GET /api/validate-plate/

验证车牌号格式是否符合中国车牌号规范（GA 36-2018）。

**需要登录**：是

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| license_plate | string | 是 | 待验证的车牌号 |

#### 请求示例

```bash
curl "http://localhost:8000/parking/api/validate-plate/?license_plate=粤E9KM03"
```

#### 有效车牌响应

```json
{
    "success": true,
    "message": "车牌号格式正确",
    "data": {
        "license_plate": "粤E9KM03"
    }
}
```

#### 无效车牌响应

```json
{
    "success": false,
    "message": "车牌号格式不正确: ABC123，请输入有效的中国车牌号",
    "error_code": "invalid_format"
}
```

---

## 车牌号规范

系统支持以下中国车牌号格式：

### 普通车牌（7位）
- 格式：`省份简称 + 地市代号 + 5位序号`
- 示例：`粤E9KM03`、`京A12345`

### 新能源车牌（8位）
- 小型车：`省份 + 地市 + D/F + 5位序号`
- 大型车：`省份 + 地市 + 4位序号 + D/F`
- 示例：`粤ED12345`、`京A1234D`

### 特殊车牌
- 挂车：`粤E1234挂`
- 学车：`粤E1234学`
- 警车：`粤E1234警`
- 港澳：`粤E1234港`、`粤E1234澳`

### 省份简称

```
京(北京) 津(天津) 沪(上海) 渝(重庆)
冀(河北) 豫(河南) 云(云南) 辽(辽宁)
黑(黑龙江) 湘(湖南) 皖(安徽) 鲁(山东)
新(新疆) 苏(江苏) 浙(浙江) 赣(江西)
鄂(湖北) 桂(广西) 甘(甘肃) 晋(山西)
蒙(内蒙古) 陕(陕西) 吉(吉林) 闽(福建)
贵(贵州) 粤(广东) 青(青海) 藏(西藏)
川(四川) 宁(宁夏) 琼(海南)
```

### 地市代号

- 使用 A-Z（不含 I 和 O，避免与数字混淆）
- 例如：粤E = 广东省佛山市

---

## 使用示例

### Python 示例

```python
import requests

# 查询车辆状态（无需登录）
response = requests.get(
    'http://localhost:8000/parking/api/query/',
    params={'license_plate': '粤E9KM03'}
)
data = response.json()
print(f"车辆状态: {'在场' if data['data']['is_parked'] else '不在场'}")

# 车辆入场（需要登录）
session = requests.Session()
# 先登录获取session
session.post('http://localhost:8000/login/', data={
    'username': 'staff',
    'password': 'staff123'
})

# 获取CSRF token
csrf_token = session.cookies.get('csrftoken')

# 车辆入场
response = session.post(
    'http://localhost:8000/parking/api/entry/',
    json={
        'license_plate': '粤A12345',
        'parking_lot_id': 1,
        'vehicle_type': 'car'
    },
    headers={'X-CSRFToken': csrf_token}
)
print(response.json())
```

### JavaScript 示例

```javascript
// 查询车辆状态
async function queryVehicle(plate) {
    const response = await fetch(
        `/parking/api/query/?license_plate=${encodeURIComponent(plate)}`
    );
    const data = await response.json();
    
    if (data.success && data.data.is_parked) {
        console.log(`当前费用: ¥${data.data.current_fee}`);
    }
}

// 车辆入场（需要CSRF token）
async function vehicleEntry(plate, lotId) {
    const response = await fetch('/parking/api/entry/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({
            license_plate: plate,
            parking_lot_id: lotId,
            vehicle_type: 'car'
        })
    });
    return await response.json();
}
```

