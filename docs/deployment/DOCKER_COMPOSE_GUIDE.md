# Docker Compose 多环境配置指南

**版本**: 1.0.0  
**日期**: 2025-12-16

---

## 📋 概述

本文档介绍如何使用 Docker Compose 管理多环境配置，采用**基础配置 + 覆盖文件**的最佳实践方案。

---

## 🎯 设计原则

### 为什么使用基础配置 + 覆盖？

1. **避免重复**: 基础配置包含所有环境共享的设置
2. **易于维护**: 环境差异集中在覆盖文件中
3. **灵活组合**: 通过命令组合灵活切换环境
4. **版本控制**: 单一仓库管理，避免分支漂移
5. **CI/CD 友好**: 通过参数动态选择环境

### 为什么不使用 Git 分支管理环境？

❌ **分支管理的缺点**:
- 分支漂移难以控制
- 合并冲突频繁
- 代码验证复杂化
- 不符合现代 CI/CD 最佳实践

✅ **推荐方案**:
- 单主分支 + 多 Compose 文件
- 环境变量隔离
- CI/CD 通过命令参数切换环境

---

## 📁 文件结构

```
.
├── docker-compose.base.yml          # 基础配置（所有环境共享）
├── docker-compose.override.yml      # 本地开发覆盖（自动加载，不提交）
├── docker-compose.dev.yml          # 开发环境覆盖
├── docker-compose.staging.yml      # 预发布环境覆盖
├── docker-compose.prod.yml         # 生产环境覆盖
├── docker-compose.test.yml         # 测试环境配置
├── docker-compose.yml              # 向后兼容（使用 include）
├── .env.dev.example                # 开发环境变量示例
├── .env.staging.example            # 预发布环境变量示例
├── .env.production.example         # 生产环境变量示例
└── .env                            # 本地环境变量（不提交）
```

---

## 🚀 使用方法

### 1. 开发环境

#### 方式 1: 使用覆盖文件（推荐）

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

**创建本地覆盖文件**:
```bash
# 复制示例或创建自己的覆盖文件
cp docker-compose.override.yml.example docker-compose.override.yml
# 编辑 docker-compose.override.yml 进行个性化配置
```

#### 方式 3: 向后兼容

```bash
# 使用 docker-compose.yml（包含 include）
docker compose up -d
```

### 2. 预发布环境

```bash
# 1. 配置环境变量
cp .env.staging.example .env.staging
vim .env.staging

# 2. 启动服务
docker compose \
  -f docker-compose.base.yml \
  -f docker-compose.staging.yml \
  --env-file .env.staging \
  up -d
```

### 3. 生产环境

```bash
# 1. 配置环境变量
cp .env.production.example .env.production
vim .env.production

# 2. 启动服务
docker compose \
  -f docker-compose.base.yml \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d
```

### 4. 测试环境

```bash
# 运行测试
docker compose -f docker-compose.test.yml run --rm test

# 代码质量检查
docker compose -f docker-compose.test.yml run --rm lint
```

---

## 🔧 配置合并规则

### Docker Compose 合并机制

Docker Compose 按文件顺序合并配置：

1. **列表合并**: `ports`、`volumes`、`environment` 等列表会合并
2. **值覆盖**: 标量值（字符串、数字）会被后面的文件覆盖
3. **服务扩展**: 后面的文件可以添加新服务或扩展现有服务

### 使用 `!override` 完全替换

如果需要完全替换列表（而不是合并），使用 `!override`:

```yaml
services:
  web:
    ports: !override
      - "8000:8000"  # 只保留这个端口，不合并其他端口
```

### 环境变量优先级

从高到低：
1. Shell 环境变量
2. `--env-file` 指定的文件
3. Compose 文件中的 `environment`
4. `.env` 文件

---

## 📝 环境变量管理

### 创建环境变量文件

```bash
# 开发环境
cp .env.dev.example .env.dev
vim .env.dev

# 预发布环境
cp .env.staging.example .env.staging
vim .env.staging

# 生产环境
cp .env.production.example .env.production
vim .env.production
```

### 环境变量文件示例

**`.env.dev`** (开发环境):
```bash
DEBUG=True
LOG_LEVEL=debug
DB_PASSWORD=postgres
SECRET_KEY=django-insecure-dev-key
```

**`.env.staging`** (预发布环境):
```bash
DEBUG=False
LOG_LEVEL=info
DB_PASSWORD=strong-staging-password
SECRET_KEY=staging-secret-key
```

**`.env.production`** (生产环境):
```bash
DEBUG=False
LOG_LEVEL=info
DB_PASSWORD=very-strong-production-password
SECRET_KEY=production-secret-key-from-secrets-manager
```

### 安全最佳实践

✅ **推荐做法**:
- 使用 `.env.example` 文件作为模板
- 将 `.env.*` 添加到 `.gitignore`
- 生产环境使用 Docker Secrets 或密钥管理工具
- 定期轮换密钥和密码

❌ **避免做法**:
- 不要在 Compose 文件中硬编码密码
- 不要将 `.env` 文件提交到版本控制
- 不要在日志中输出敏感信息

---

## 🎨 配置示例

### 基础配置 (`docker-compose.base.yml`)

包含所有环境共享的配置：
- 服务定义
- 网络配置
- 基础环境变量
- 健康检查

### 开发环境覆盖 (`docker-compose.dev.yml`)

覆盖内容：
- 使用 `Dockerfile.dev`
- 挂载代码目录（热重载）
- 暴露调试端口
- 启用 DEBUG 模式
- 添加开发工具（PgAdmin、Redis Commander）

### 预发布环境覆盖 (`docker-compose.staging.yml`)

覆盖内容：
- 使用生产 Dockerfile
- 使用 Gunicorn
- 添加 Nginx
- 资源限制（中等）
- 日志级别：info

### 生产环境覆盖 (`docker-compose.prod.yml`)

覆盖内容：
- 使用生产 Dockerfile
- 使用 Gunicorn
- 添加 Nginx
- 资源限制（高）
- 添加 PgBouncer（可选）
- 完整监控和日志

---

## 🔄 CI/CD 集成

### GitHub Actions 示例

```yaml
name: Deploy

on:
  push:
    branches:
      - main
      - staging

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          docker compose \
            -f docker-compose.base.yml \
            -f docker-compose.staging.yml \
            --env-file .env.staging \
            up -d

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        env:
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          SECRET_KEY: ${{ secrets.SECRET_KEY }}
        run: |
          docker compose \
            -f docker-compose.base.yml \
            -f docker-compose.prod.yml \
            --env-file .env.production \
            up -d
```

### GitLab CI 示例

```yaml
stages:
  - deploy

deploy:staging:
  stage: deploy
  script:
    - docker compose -f docker-compose.base.yml -f docker-compose.staging.yml --env-file .env.staging up -d
  only:
    - staging

deploy:production:
  stage: deploy
  script:
    - docker compose -f docker-compose.base.yml -f docker-compose.prod.yml --env-file .env.production up -d
  only:
    - main
  when: manual
```

---

## 🛠️ 常用命令

### 查看合并后的配置

```bash
# 查看开发环境完整配置
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml config

# 查看生产环境完整配置
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml config

# 验证配置语法
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml config --quiet
```

### 环境切换

```bash
# 从开发切换到预发布
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down
docker compose -f docker-compose.base.yml -f docker-compose.staging.yml --env-file .env.staging up -d
```

### 服务管理

```bash
# 启动特定环境的服务
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d web

# 查看特定环境的日志
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml logs -f web

# 重启特定环境的服务
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml restart web
```

---

## 📊 环境对比表

| 特性 | 开发环境 | 预发布环境 | 生产环境 |
|------|---------|-----------|---------|
| **配置文件** | base + dev | base + staging | base + prod |
| **Dockerfile** | Dockerfile.dev | Dockerfile | Dockerfile |
| **服务器** | Django runserver | Gunicorn | Gunicorn |
| **热重载** | ✅ | ❌ | ❌ |
| **调试端口** | ✅ (5678) | ❌ | ❌ |
| **代码挂载** | ✅ | ❌ | ❌ |
| **Nginx** | ❌ | ✅ | ✅ |
| **Celery** | ✅ | ✅ | ✅ |
| **资源限制** | 无 | 中等 | 高 |
| **数据持久化** | ✅ | ✅ | ✅ |
| **监控** | ❌ | 基础 | 完整 |

---

## 🎯 最佳实践

### 1. 配置组织

✅ **推荐**:
- 基础配置只包含共享设置
- 环境差异集中在覆盖文件
- 使用环境变量管理敏感信息
- 使用 `!override` 完全替换列表

❌ **避免**:
- 在基础配置中硬编码环境特定值
- 复制整个服务定义
- 在代码中判断环境

### 2. 环境变量管理

✅ **推荐**:
- 使用 `.env.example` 作为模板
- 不同环境使用不同的 `.env` 文件
- 生产环境使用密钥管理工具
- 定期轮换密钥

❌ **避免**:
- 将 `.env` 文件提交到版本控制
- 在 Compose 文件中硬编码密码
- 使用弱密码

### 3. 版本控制

✅ **提交到版本控制**:
- `docker-compose.base.yml`
- `docker-compose.*.yml` (覆盖文件)
- `.env.*.example` (示例文件)
- `Dockerfile` 和 `Dockerfile.dev`

❌ **不提交到版本控制**:
- `.env` 文件
- `.env.dev`、`.env.staging`、`.env.production`
- `docker-compose.override.yml` (本地个性化)

### 4. CI/CD 集成

✅ **推荐**:
- 使用 CI/CD 变量管理敏感信息
- 通过命令参数切换环境
- 自动化测试和部署
- 使用 Docker Secrets（生产环境）

---

## 🔍 故障排除

### 问题 1: 配置合并不符合预期

**解决方案**:
```bash
# 查看合并后的完整配置
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml config

# 检查环境变量
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml config | grep -A 10 "environment:"
```

### 问题 2: 环境变量未生效

**解决方案**:
```bash
# 检查环境变量优先级
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml --env-file .env.dev config

# 查看容器内环境变量
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml exec web env
```

### 问题 3: 端口冲突

**解决方案**:
```bash
# 检查端口占用
netstat -tlnp | grep -E '8000|5432|6379'

# 修改覆盖文件中的端口映射
# 在 docker-compose.dev.yml 中修改 ports
```

---

## 📚 相关文档

- [Docker 开发测试环境指南](./DEVELOPMENT_DOCKER.md) - 开发环境详细说明
- [快速部署指南](./QUICK_START.md) - 生产环境快速部署
- [完整技术栈方案](./PRODUCTION_TECH_STACK.md) - 技术栈详细说明
- [Docker Compose 官方文档](https://docs.docker.com/compose/) - 官方文档

---

## 📌 总结

### 推荐工作流

1. **开发**: 使用 `docker-compose.override.yml` 或 `docker-compose.dev.yml`
2. **测试**: 使用 `docker-compose.test.yml`
3. **预发布**: 使用 `docker-compose.staging.yml` + `.env.staging`
4. **生产**: 使用 `docker-compose.prod.yml` + `.env.production`

### 关键原则

- ✅ 单一仓库，多配置文件
- ✅ 基础配置 + 环境覆盖
- ✅ 环境变量隔离敏感信息
- ✅ CI/CD 通过命令参数切换
- ❌ 不使用 Git 分支管理环境

---

**文档维护**: HeZaoCha  
**最后更新**: 2025-12-16
