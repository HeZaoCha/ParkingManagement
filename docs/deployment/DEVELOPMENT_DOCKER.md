# Docker 开发测试环境指南

**版本**: 1.0.0  
**日期**: 2025-12-15

---

## 📋 概述

本文档介绍如何使用 Docker Compose 搭建开发测试环境，支持热重载、调试和测试。

---

## 🚀 快速开始

### 1. 开发环境启动

#### 方式 1: 使用基础配置 + 覆盖（推荐）

```bash
# 使用基础配置 + 开发覆盖
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

# 指定环境变量文件
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml --env-file .env.dev up -d
```

#### 方式 2: 使用自动加载（最简单）

```bash
# Docker Compose 会自动加载 docker-compose.override.yml（如果存在）
docker compose up -d
```

#### 方式 3: 向后兼容

```bash
# 使用 docker-compose.yml（包含 include）
docker compose up -d
```

> **详细说明**: 请参考 [Docker Compose 多环境配置指南](./DOCKER_COMPOSE_GUIDE.md)

### 2. 初始化数据库

```bash
# 执行数据库迁移
docker-compose -f docker-compose.dev.yml exec web python manage.py migrate

# 创建超级用户
docker-compose -f docker-compose.dev.yml exec web python manage.py createsuperuser

# 初始化测试数据（可选）
docker-compose -f docker-compose.dev.yml exec web python manage.py init_test_data --clear
```

### 3. 访问应用

- **Web 应用**: http://localhost:8000
- **PgAdmin** (可选): http://localhost:5050 (需要启动 tools profile)
- **Redis Commander** (可选): http://localhost:8081 (需要启动 tools profile)

---

## 🔧 开发环境特性

### 1. 热重载支持

开发环境配置了卷挂载，代码修改会自动反映到容器中：

```yaml
volumes:
  - .:/app  # 挂载整个项目目录
  - /app/.venv  # 排除虚拟环境
  - /app/__pycache__  # 排除缓存文件
```

**特性**:
- ✅ Django 开发服务器自动检测文件变化
- ✅ 无需重启容器即可看到代码更改
- ✅ 支持 Python 文件、模板、静态文件等

### 2. 调试支持

#### VS Code 调试配置

复制示例配置：

```bash
# 复制 VS Code 调试配置示例
mkdir -p .vscode
cp .vscode/launch.json.example .vscode/launch.json
```

或者手动创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Django (Docker)",
      "type": "debugpy",
      "request": "attach",
      "connect": {
        "host": "localhost",
        "port": 5678
      },
      "pathMappings": [
        {
          "localRoot": "${workspaceFolder}",
          "remoteRoot": "/app"
        }
      ],
      "justMyCode": false,
      "jinja": true
    }
  ]
}
```

#### 启动调试模式

```bash
# 使用调试模式启动（需要安装 debugpy）
docker-compose -f docker-compose.dev.yml run --rm web \
  python -m debugpy --listen 0.0.0.0:5678 manage.py runserver 0.0.0.0:8000
```

#### 使用 IPython 调试

在代码中使用断点：

```python
# 在代码中设置断点
import ipdb; ipdb.set_trace()
```

### 3. 开发工具

#### 启动可选工具

```bash
# 启动 PgAdmin 和 Redis Commander
docker-compose -f docker-compose.dev.yml --profile tools up -d
```

**PgAdmin**:
- URL: http://localhost:5050
- 邮箱: admin@example.com
- 密码: admin
- 添加服务器:
  - Host: db
  - Port: 5432
  - Username: postgres
  - Password: postgres

**Redis Commander**:
- URL: http://localhost:8081
- 自动连接到 Redis 服务

### 4. Django Debug Toolbar

开发环境已配置 Django Debug Toolbar，访问页面时会自动显示调试工具栏。

**功能**:
- SQL 查询分析
- 模板调试
- 请求/响应信息
- 性能分析

---

## 🧪 测试环境

### 运行测试

```bash
# 运行所有测试
docker-compose -f docker-compose.test.yml run --rm test

# 运行特定测试文件
docker-compose -f docker-compose.test.yml run --rm test pytest parking/tests/test_models.py -v

# 运行测试并生成覆盖率报告
docker-compose -f docker-compose.test.yml run --rm test pytest --cov=parking --cov-report=html
```

### 查看覆盖率报告

```bash
# 覆盖率报告保存在 htmlcov 目录
docker-compose -f docker-compose.test.yml run --rm test pytest --cov=parking --cov-report=html

# 查看报告（需要挂载到本地）
# 或者使用 volumes 中的 test_coverage
```

### 代码质量检查

```bash
# 运行代码检查
docker-compose -f docker-compose.test.yml run --rm lint
```

---

## 📝 常用命令

### 开发环境

```bash
# 启动所有服务
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f web

# 进入容器
docker-compose -f docker-compose.dev.yml exec web bash

# 执行 Django 管理命令
docker-compose -f docker-compose.dev.yml exec web python manage.py <command>

# 重启服务
docker-compose -f docker-compose.dev.yml restart web

# 停止所有服务
docker-compose -f docker-compose.dev.yml down

# 停止并删除数据卷
docker-compose -f docker-compose.dev.yml down -v
```

### 数据库操作

```bash
# 连接数据库
docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d parking_management

# 备份数据库
docker-compose -f docker-compose.dev.yml exec db pg_dump -U postgres parking_management > backup.sql

# 恢复数据库
docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres parking_management < backup.sql
```

### Redis 操作

```bash
# 连接 Redis
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# 查看 Redis 信息
docker-compose -f docker-compose.dev.yml exec redis redis-cli INFO
```

---

## 🔍 调试技巧

### 1. 查看容器日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose.dev.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.dev.yml logs -f web
docker-compose -f docker-compose.dev.yml logs -f celery_worker
```

### 2. 进入容器调试

```bash
# 进入 Web 容器
docker-compose -f docker-compose.dev.yml exec web bash

# 在容器内执行命令
docker-compose -f docker-compose.dev.yml exec web python manage.py shell
docker-compose -f docker-compose.dev.yml exec web python manage.py dbshell
```

### 3. 检查服务状态

```bash
# 查看服务状态
docker-compose -f docker-compose.dev.yml ps

# 查看服务健康状态
docker-compose -f docker-compose.dev.yml ps --format json | jq '.[] | {name: .Name, status: .State}'
```

### 4. 性能分析

```bash
# 使用 Django Debug Toolbar（自动启用）
# 访问 http://localhost:8000，查看页面底部的调试工具栏

# 使用 Django 性能分析
docker-compose -f docker-compose.dev.yml exec web python manage.py shell
>>> from django.test.utils import override_settings
>>> from django.db import connection
>>> # 执行查询后
>>> connection.queries
```

---

## 🛠️ 故障排除

### 问题 1: 代码更改不生效

**解决方案**:
```bash
# 检查卷挂载
docker-compose -f docker-compose.dev.yml exec web ls -la /app

# 重启服务
docker-compose -f docker-compose.dev.yml restart web
```

### 问题 2: 端口冲突

**解决方案**:
```bash
# 检查端口占用
netstat -tlnp | grep -E '8000|5432|6379'

# 修改 docker-compose.dev.yml 中的端口映射
ports:
  - "8001:8000"  # 使用不同端口
```

### 问题 3: 数据库连接失败

**解决方案**:
```bash
# 检查数据库服务
docker-compose -f docker-compose.dev.yml ps db

# 查看数据库日志
docker-compose -f docker-compose.dev.yml logs db

# 检查环境变量
docker-compose -f docker-compose.dev.yml exec web env | grep DB_
```

### 问题 4: 依赖安装失败

**解决方案**:
```bash
# 重新构建镜像
docker-compose -f docker-compose.dev.yml build --no-cache web

# 清理构建缓存
docker system prune -a
```

---

## 📚 环境对比

| 特性 | docker-compose.yml | docker-compose.dev.yml | docker-compose.test.yml |
|------|-------------------|------------------------|------------------------|
| **用途** | 简化开发环境 | 完整开发环境 | 测试环境 |
| **热重载** | ✅ | ✅ | ❌ |
| **调试支持** | ✅ | ✅ | ❌ |
| **Celery** | ❌ | ✅ | ❌ |
| **开发工具** | ❌ | ✅ (可选) | ❌ |
| **测试工具** | ❌ | ❌ | ✅ |
| **数据持久化** | ✅ | ✅ | ❌ (tmpfs) |
| **性能优化** | ❌ | ❌ | ✅ (测试优化) |

### 选择建议

- **日常开发**: 
  - 推荐: `docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up`
  - 或: `docker compose up`（自动加载 override）
- **快速测试**: 使用 `docker-compose.yml`（向后兼容）
- **运行测试**: 使用 `docker-compose.test.yml`
- **预发布部署**: `docker compose -f docker-compose.base.yml -f docker-compose.staging.yml --env-file .env.staging up`
- **生产部署**: `docker compose -f docker-compose.base.yml -f docker-compose.prod.yml --env-file .env.production up`

> **详细说明**: 请参考 [Docker Compose 多环境配置指南](./DOCKER_COMPOSE_GUIDE.md)

---

## 🎯 最佳实践

### 1. 开发工作流

```bash
# 1. 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 2. 编写代码（本地编辑器）
# 代码自动同步到容器

# 3. 查看日志
docker-compose -f docker-compose.dev.yml logs -f web

# 4. 运行测试
docker-compose -f docker-compose.test.yml run --rm test

# 5. 提交代码
git add .
git commit -m "feat: 新功能"
```

### 2. 调试工作流

```bash
# 1. 在代码中设置断点
import ipdb; ipdb.set_trace()

# 2. 启动调试模式
docker-compose -f docker-compose.dev.yml run --rm web \
  python -m debugpy --listen 0.0.0.0:5678 manage.py runserver 0.0.0.0:8000

# 3. 在 VS Code 中附加调试器
# 按 F5 或点击"开始调试"
```

### 3. 测试工作流

```bash
# 1. 运行所有测试
docker-compose -f docker-compose.test.yml run --rm test

# 2. 运行特定测试
docker-compose -f docker-compose.test.yml run --rm test pytest parking/tests/test_models.py::TestParkingLot -v

# 3. 生成覆盖率报告
docker-compose -f docker-compose.test.yml run --rm test pytest --cov=parking --cov-report=html --cov-report=term

# 4. 查看覆盖率
# 报告保存在 htmlcov 目录
```

---

## 📖 相关文档

- [快速部署指南](./QUICK_START.md) - 生产环境快速部署
- [完整技术栈方案](./PRODUCTION_TECH_STACK.md) - 生产环境技术栈
- [开发指南](../development/DEVELOPMENT.md) - 项目开发指南

---

**文档维护**: HeZaoCha  
**最后更新**: 2025-12-15
