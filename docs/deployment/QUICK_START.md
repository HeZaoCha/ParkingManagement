# 生产环境快速部署指南

**版本**: 1.0.0  
**日期**: 2025-12-15

---

## 📋 前置要求

- Docker 20.10+
- Docker Compose v5.0.0+
- 服务器配置：4 核心 CPU，16GB 内存，100GB SSD

> **注意**: 本文档针对生产环境部署。如需开发测试环境，请参考 [Docker 开发测试环境指南](./DEVELOPMENT_DOCKER.md)

---

## 🚀 快速部署步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd ParkingManagement
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑环境变量（必须修改）
vim .env.production
```

> **注意**: 生产环境推荐使用密钥管理工具（如 Docker Secrets、Vault）管理敏感信息

**必须配置的变量**:
- `SECRET_KEY`: Django 密钥（使用 `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` 生成）
- `DB_PASSWORD`: 数据库密码（强密码）
- `ALLOWED_HOSTS`: 域名列表（逗号分隔）
- `EMAIL_HOST_USER`: 邮件用户名
- `EMAIL_HOST_PASSWORD`: 邮件密码

### 3. 配置 SSL 证书

```bash
# 使用 Let's Encrypt 获取证书
certbot certonly --standalone -d yourdomain.com

# 复制证书到项目目录
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

### 4. 构建和启动服务

```bash
# 构建镜像
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml build

# 启动所有服务
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml --env-file .env.production up -d

# 查看服务状态
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml ps
```

> **推荐方式**: 使用基础配置 + 覆盖文件的方式，更灵活易维护

### 5. 初始化数据库

```bash
# 执行数据库迁移
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec web python manage.py migrate

# 创建超级用户
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec web python manage.py createsuperuser

# 收集静态文件
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
```

### 6. 验证部署

```bash
# 检查健康端点
curl http://localhost/health/

# 检查服务日志
docker-compose -f docker-compose.prod.yml logs -f web
```

---

## 📊 服务管理

### 查看服务状态

```bash
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml ps
```

### 查看日志

```bash
# 查看所有服务日志
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml logs -f db
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml logs -f redis
```

### 重启服务

```bash
# 重启所有服务
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml restart

# 重启特定服务
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml restart web
```

### 停止服务

```bash
# 停止所有服务
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml down

# 停止并删除数据卷（谨慎使用）
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml down -v
```

### 扩展服务

```bash
# 扩展 Web 服务到 3 个实例
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --scale web=3
```

---

## 🔧 常用操作

### 执行 Django 管理命令

```bash
# 数据库迁移
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec web python manage.py migrate

# 创建超级用户
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec web python manage.py createsuperuser

# 收集静态文件
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput

# Django Shell
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec web python manage.py shell
```

### 数据库操作

```bash
# 连接数据库
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec db psql -U postgres -d parking_management

# 备份数据库
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec db pg_dump -U postgres parking_management > backup.sql

# 恢复数据库
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec -T db psql -U postgres parking_management < backup.sql
```

### Redis 操作

```bash
# 连接 Redis
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec redis redis-cli

# 查看 Redis 信息
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec redis redis-cli INFO
```

---

## 🐛 故障排除

### 服务无法启动

1. **检查日志**:
   ```bash
   docker compose -f docker-compose.base.yml -f docker-compose.prod.yml logs web
   ```

2. **检查合并后的配置**:
   ```bash
   docker compose -f docker-compose.base.yml -f docker-compose.prod.yml config
   ```

3. **检查端口占用**:
   ```bash
   netstat -tlnp | grep -E '80|443|5432|6379'
   ```

### 数据库连接失败

1. **检查数据库服务**:
   ```bash
   docker compose -f docker-compose.base.yml -f docker-compose.prod.yml ps db
   docker compose -f docker-compose.base.yml -f docker-compose.prod.yml logs db
   ```

2. **检查环境变量**:
   ```bash
   docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec web env | grep DB_
   ```

### 静态文件 404

1. **重新收集静态文件**:
   ```bash
   docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
   ```

2. **检查 Nginx 配置**:
   ```bash
   docker compose -f docker-compose.base.yml -f docker-compose.prod.yml exec nginx nginx -t
   ```

### SSL 证书问题

1. **检查证书文件**:
   ```bash
   ls -la nginx/ssl/
   ```

2. **重新加载 Nginx**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

---

## 📚 相关文档

- [Docker Compose 多环境配置指南](./DOCKER_COMPOSE_GUIDE.md) - 多环境配置最佳实践
- [Docker 开发测试环境指南](./DEVELOPMENT_DOCKER.md) - 开发测试环境详细说明
- [完整技术栈方案](./PRODUCTION_TECH_STACK.md) - 详细的技术栈说明和性能优化
- [部署文档](./DEPLOYMENT.md) - 传统部署方式
- [API 文档](../api/API.md) - API 接口文档

---

**文档维护**: HeZaoCha  
**最后更新**: 2025-12-15
