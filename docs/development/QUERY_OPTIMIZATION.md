# 数据库查询优化指南

**创建日期**: 2025-12-14  
**版本**: 1.0.0

---

## 📊 概述

本文档提供数据库查询优化的方法和工具，帮助识别和优化慢查询。

---

## 🔍 分析慢查询

### 使用Django管理命令

```bash
# 分析最慢的10个查询
python manage.py analyze_queries

# 分析最慢的20个查询，只显示超过0.5秒的查询
python manage.py analyze_queries --limit 20 --min-time 0.5
```

### 使用Django Debug Toolbar

1. 安装Django Debug Toolbar：
```bash
pip install django-debug-toolbar
```

2. 在 `settings.py` 中配置：
```python
INSTALLED_APPS = [
    # ...
    'debug_toolbar',
]

MIDDLEWARE = [
    # ...
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

INTERNAL_IPS = ['127.0.0.1']
```

3. 在 `urls.py` 中添加：
```python
if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls)),
    ]
```

---

## 📈 检查索引

### 使用管理命令

```bash
# 检查缺失的索引
python manage.py check_indexes
```

### 手动检查

1. **检查ForeignKey字段**：外键字段通常需要索引
2. **检查常用查询字段**：经常用于WHERE、ORDER BY的字段
3. **检查组合索引**：多字段查询考虑组合索引

---

## 🛠️ 优化方法

### 1. 使用 select_related

```python
# 避免N+1查询
records = ParkingRecord.objects.select_related('parking_space', 'vehicle').all()
```

### 2. 使用 prefetch_related

```python
# 预取关联对象
lots = ParkingLot.objects.prefetch_related('spaces').all()
```

### 3. 使用 only() 和 defer()

```python
# 只获取需要的字段
records = ParkingRecord.objects.only('id', 'entry_time', 'exit_time')
```

### 4. 添加数据库索引

```python
class ParkingRecord(models.Model):
    license_plate = models.CharField(max_length=20, db_index=True)
    entry_time = models.DateTimeField(db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['license_plate', 'entry_time']),
        ]
```

### 5. 使用聚合查询

```python
# 使用聚合而不是Python循环
from django.db.models import Count, Sum
stats = ParkingRecord.objects.aggregate(
    total=Count('id'),
    revenue=Sum('fee')
)
```

---

## 📝 最佳实践

1. **始终使用 select_related 和 prefetch_related**
2. **为常用查询字段添加索引**
3. **避免在循环中查询数据库**
4. **使用批量操作（bulk_create, bulk_update）**
5. **定期分析慢查询日志**

---

## 🔗 相关文档

- [Django查询优化](https://docs.djangoproject.com/en/stable/topics/db/optimization/)
- [数据库索引最佳实践](./DATABASE_INDEXES.md)

---

**最后更新**: 2025-12-14

