# 部署文档

本文档介绍如何将停车场管理系统部署到生产环境。

## 环境要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Python | 3.10+ | 3.13 |
| PostgreSQL | 13+ | 16 |
| Nginx | 1.18+ | 1.24 |
| uv | 0.1+ | 最新 |

## 部署架构

```
                        ┌──────────────┐
                        │   Nginx      │
                        │ (反向代理)    │
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
       ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
       │  Gunicorn   │  │  Gunicorn   │  │  Gunicorn   │
       │  Worker 1   │  │  Worker 2   │  │  Worker 3   │
       └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                        ┌──────▼───────┐
                        │  PostgreSQL  │
                        │   Database   │
                        └──────────────┘
```

## 快速部署

### 1. 服务器准备

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3.13 python3.13-venv postgresql nginx

# CentOS/RHEL
sudo dnf install -y python3.13 postgresql-server nginx
```

### 2. 克隆项目

```bash
cd /opt
sudo git clone <repository-url> parking
cd parking
sudo chown -R www-data:www-data .
```

### 3. 安装依赖

```bash
# 安装 uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 安装项目依赖
uv sync --no-dev
```

### 4. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << EOF
DEBUG=False
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
DATABASE_URL=postgres://parking_user:password@localhost:5432/parking_db
STATIC_ROOT=/opt/parking/staticfiles
EOF
```

### 5. 配置数据库

```bash
# PostgreSQL 设置
sudo -u postgres psql << EOF
CREATE DATABASE parking_db;
CREATE USER parking_user WITH PASSWORD 'your-secure-password';
ALTER ROLE parking_user SET client_encoding TO 'utf8';
ALTER ROLE parking_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE parking_user SET timezone TO 'Asia/Shanghai';
GRANT ALL PRIVILEGES ON DATABASE parking_db TO parking_user;
EOF
```

### 6. 数据库迁移

```bash
uv run python manage.py migrate
uv run python manage.py collectstatic --noinput
uv run python manage.py createsuperuser
```

### 7. Gunicorn 配置

```bash
# /etc/systemd/system/parking.service
cat > /etc/systemd/system/parking.service << EOF
[Unit]
Description=Parking Management Gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/parking
ExecStart=/opt/parking/.venv/bin/gunicorn \
    --workers 3 \
    --bind unix:/opt/parking/parking.sock \
    --access-logfile /var/log/parking/access.log \
    --error-logfile /var/log/parking/error.log \
    config.wsgi:application

[Install]
WantedBy=multi-user.target
EOF

# 创建日志目录
sudo mkdir -p /var/log/parking
sudo chown www-data:www-data /var/log/parking

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable parking
sudo systemctl start parking
```

### 8. Nginx 配置

```nginx
# /etc/nginx/sites-available/parking
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 静态文件
    location /static/ {
        alias /opt/parking/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        gzip on;
        gzip_vary on;
        gzip_min_length 1000;
        gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
        gzip_comp_level 6;
        brotli on;
        brotli_comp_level 6;
        brotli_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
    }

    # 媒体文件
    location /media/ {
        alias /opt/parking/media/;
        expires 7d;
    }

    # Service Worker
    location /static/parking/js/sw.js {
        alias /opt/parking/staticfiles/parking/js/sw.js;
        add_header Content-Type "application/javascript";
        add_header Service-Worker-Allowed "/";
    }

    # Django 应用
    location / {
        proxy_pass http://unix:/opt/parking/parking.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        gzip on;
        gzip_vary on;
        gzip_min_length 1000;
        gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
        gzip_comp_level 6;
        brotli on;
        brotli_comp_level 6;
        brotli_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/parking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 生产环境配置

### settings.py 修改

```python
# ParkingManagement/settings_prod.py
import os
from .settings import *

DEBUG = False
SECRET_KEY = os.environ['SECRET_KEY']
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# 数据库
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'parking_db'),
        'USER': os.environ.get('DB_USER', 'parking_user'),
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 60,
    }
}

# 静态文件
STATIC_ROOT = os.environ.get('STATIC_ROOT', '/opt/parking/staticfiles')

# 安全设置
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# 日志
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/parking/django.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
}
```

---

## Docker 部署

### Dockerfile

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# 复制项目文件
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --frozen

COPY . .

# 收集静态文件
RUN uv run python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["uv", "run", "gunicorn", "--bind", "0.0.0.0:8000", "config.wsgi:application"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=postgres://parking:password@db:5432/parking_db
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=parking_db
      - POSTGRES_USER=parking
      - POSTGRES_PASSWORD=password
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./staticfiles:/usr/share/nginx/html/static
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
```

### 启动容器

```bash
docker-compose up -d
docker-compose exec web uv run python manage.py migrate
docker-compose exec web uv run python manage.py createsuperuser
```

---

## 监控与维护

### 日志查看

```bash
# 应用日志
tail -f /var/log/parking/django.log

# Gunicorn 日志
tail -f /var/log/parking/access.log
tail -f /var/log/parking/error.log

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 数据库备份

```bash
# 创建备份脚本
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/opt/backups
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U parking_user parking_db | gzip > $BACKUP_DIR/parking_$DATE.sql.gz
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /opt/backup.sh

# 添加 cron 任务（每天凌晨2点备份）
echo "0 2 * * * /opt/backup.sh" | crontab -
```

### 服务管理

```bash
# 重启应用
sudo systemctl restart parking

# 查看状态
sudo systemctl status parking

# 查看日志
sudo journalctl -u parking -f
```

---

## 故障排除

### 常见问题

1. **502 Bad Gateway**
   - 检查 Gunicorn 是否运行
   - 检查 socket 文件权限

2. **静态文件404**
   - 运行 `collectstatic`
   - 检查 Nginx 配置路径

3. **数据库连接失败**
   - 检查数据库服务状态
   - 验证连接参数

4. **权限错误**
   - 检查文件所有者
   - 检查 SELinux 设置

### 健康检查

```bash
# 检查服务状态
systemctl status parking nginx postgresql

# 检查端口
netstat -tlnp | grep -E '80|443|5432'

# 测试应用
curl -I http://localhost:8000/login/
```

