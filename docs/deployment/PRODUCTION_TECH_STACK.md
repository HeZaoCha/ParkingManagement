# 生产环境技术栈方案

**版本**: 3.0.0  
**日期**: 2025-12-15  
**目标**: 支持 10 万级别用户流畅运行  
**更新**: 
- 更新所有组件到指定版本
- 添加监控、日志、备份、CI/CD 等完整方案
- 添加生产环境最佳实践和优化建议
- 完善安全配置和性能优化

---

## 📋 目录

1. [技术栈概览](#技术栈概览)
2. [版本信息](#版本信息)
3. [架构设计](#架构设计)
4. [性能优化策略](#性能优化策略)
5. [高可用方案](#高可用方案)
6. [安全配置](#安全配置)
7. [监控与日志](#监控与日志)
8. [备份与恢复](#备份与恢复)
9. [CI/CD 持续集成](#cicd-持续集成)
10. [部署步骤](#部署步骤)
11. [扩展性规划](#扩展性规划)
12. [生产环境最佳实践](#生产环境最佳实践)

> **开发测试环境**: 如需开发测试环境配置，请参考 [Docker 开发测试环境指南](./DEVELOPMENT_DOCKER.md)

---

## 技术栈概览

### 核心组件

| 组件              | 技术选型       | 版本      | 用途                          |
| ----------------- | -------------- | --------- | ----------------------------- |
| **Web 框架**      | Django         | 5.2       | 后端应用框架                  |
| **Python**        | Python         | 3.13      | 运行时环境                    |
| **Web 服务器**    | Gunicorn       | Latest    | WSGI 服务器                   |
| **反向代理**      | Nginx          | 1.29.4    | HTTP/HTTPS 代理、静态文件服务 |
| **数据库**        | PostgreSQL     | 17.7      | 主数据库                      |
| **缓存/消息队列** | Redis          | 8.4       | 缓存、Celery 消息队列         |
| **连接池**        | PgBouncer      | 1.25.1    | PostgreSQL 连接池             |
| **任务队列**      | Celery         | Latest    | 异步任务处理                  |
| **容器化**        | Docker         | Latest    | 容器化部署                    |
| **编排工具**      | Docker Compose | v5.0.0    | 服务编排                      |

### 扩展组件（生产环境推荐）

| 组件              | 技术选型       | 版本      | 用途                          |
| ----------------- | -------------- | --------- | ----------------------------- |
| **监控**          | Prometheus     | 3.5.0     | 指标收集和监控（LTS 版本）    |
| **可视化**        | Grafana        | 12.3.0    | 监控数据可视化                |
| **日志聚合**      | Filebeat       | 9.2.2     | 日志收集和传输                |
| **错误追踪**      | Glitchtip      | 5.2.0     | 实时错误监控和追踪（自托管）  |
| **APM**           | OpenTelemetry  | Latest    | 应用性能监控                  |
| **备份工具**      | pgBackRest     | 2.57.0    | PostgreSQL 备份工具          |
| **CI/CD**         | GitHub Actions | Latest    | 持续集成和部署                |
| **镜像扫描**      | Trivy          | 0.68.1    | 容器镜像安全扫描              |

### 技术选型理由

1. **PostgreSQL 17**:

    - 最新版本，性能提升显著
    - 增强的内存管理和查询优化
    - 支持增量备份和逻辑复制
    - 更好的并发处理能力

2. **Redis 8.0**:

    - 性能优化（命令执行速度提升 87%）
    - 支持向量搜索（AI 应用场景）
    - 统一分发，更稳定
    - 适合高并发缓存场景

3. **Django + Gunicorn**:

    - Django 成熟稳定，生态丰富
    - Gunicorn 生产级 WSGI 服务器
    - 支持多进程、多线程模式
    - 易于扩展和监控

4. **Nginx**:
    - 高性能反向代理
    - 优秀的静态文件服务能力
    - 支持负载均衡
    - 完善的 SSL/TLS 支持

---

## 版本信息

### PostgreSQL 17.7 特性

**发布日期**: 2025 年 11 月 13 日

**17.7 版本更新**:

-   ✅ **安全增强**:
    -   修复 `CREATE STATISTICS` 的权限检查，防止命名冲突
    -   修复 `libpq` 中整数溢出漏洞，增强内存分配安全性
-   ✅ **JSON 函数改进**:
    -   修复 SQL/JSON 函数（如 `JSON_VALUE`）在使用 `DEFAULT` 子句时的错误
    -   修正 JSON 构造函数表达式（如 `JSON_OBJECT()`）的处理
-   ✅ **正则表达式处理**:
    -   改进 `SIMILAR TO` 正则表达式中字符类的处理

**PostgreSQL 17 核心特性**:

-   ✅ **增强的 VACUUM 内存管理**: 减少内存消耗，提升清理性能
-   ✅ **SQL/JSON 增强**: 支持 JSON_TABLE() 函数，更好的 JSON 处理
-   ✅ **查询性能优化**:
    -   流式 I/O 优化顺序读取
    -   高并发下更好的写入吞吐量
    -   B-tree 索引多值搜索优化
-   ✅ **逻辑复制增强**:
    -   故障转移控制
    -   pg_createsubscriber 工具
    -   升级时保留逻辑复制槽
-   ✅ **增量备份支持**: pg_basebackup 支持增量备份
-   ✅ **COPY 命令增强**: ON_ERROR ignore 选项

**性能提升**:

-   顺序读取性能提升约 20-30%
-   高并发写入性能提升约 15-25%
-   内存使用优化约 10-15%

### Redis 8.4 特性

**核心特性**:

-   ✅ **原子集群操作**: `CLUSTER MIGRATION` 命令支持原子槽迁移，实现零停机操作
-   ✅ **增强的字符串操作**: 
    -   新增 `DELEX` 和 `DIGEST` 命令，支持原子比较并设置/删除操作
    -   `SET` 命令支持原子操作，便于实现无锁数据结构和乐观并发控制
-   ✅ **多键过期管理**: `MSETEX` 命令支持原子设置多个键并更新过期时间
-   ✅ **高级流处理**: `XREADGROUP` 的 `CLAIM` 选项支持自动声明和处理空闲待处理条目
-   ✅ **混合搜索能力**: `FT.HYBRID` 命令支持混合查询，结合多种排序算法
-   ✅ **性能优化**:
    -   通过 SIMD 优化和增强算法提升性能
    -   改进 `BITCOUNT`、HyperLogLog 和向量操作
-   ✅ **内存效率改进**:
    -   JSON 数据类型内存占用减少（同质数组优化、短字符串内联）
    -   改进 Lua 集成中的 JSON 数组处理
-   ✅ **增强的 AOF 可靠性**: 启动时自动修复损坏的 AOF 尾部

**Redis 8.0 基础特性**:

-   ✅ **向量集合数据结构（Beta）**: 支持 AI 应用场景
-   ✅ **性能优化**: 命令执行速度提升 87%，复制性能提升 18%
-   ✅ **统一分发**: Redis Open Source 统一版本
-   ✅ **更好的内存管理**: 优化内存使用和回收

**性能提升**:

-   命令执行速度提升 87%（8.0）
-   复制性能提升 18%（8.0）
-   内存使用优化约 10-15%（8.4）
-   SIMD 优化带来额外性能提升（8.4）

### Nginx 1.29.4 特性

**发布日期**: 2025 年 12 月 9 日

**核心特性**:

-   ✅ **上游服务器 HTTP/2 支持**: `ngx_http_proxy_module` 现在支持 HTTP/2，实现更高效的上游通信
-   ✅ **加密 ClientHello (ECH) 支持**: 当使用 OpenSSL 的 ECH 功能分支构建时，支持加密 ClientHello TLS 扩展，增强 TLS 握手隐私
-   ✅ **头部继承控制**: 新增 `add_header_inherit` 和 `add_trailer_inherit` 指令，精确控制嵌套配置块中的头部继承
-   ✅ **TLS 证书压缩**: 当使用 BoringSSL 或 AWS-LC 构建时，支持 TLS 证书压缩，减少 TLS 握手大小
-   ✅ **更严格的 HTTP 分块传输编码解析**: 强制更严格的分块传输编码解析，禁止单个 LF 字符作为行终止符，提高安全性

**性能提升**:

-   HTTP/2 上游连接性能提升约 20-30%
-   TLS 握手大小减少约 10-15%（证书压缩）
-   安全性增强，防止分块传输编码攻击

### PgBouncer 1.25.1 特性

**发布日期**: 2025 年 12 月 3 日

**1.25.1 版本更新**:

-   ✅ **安全修复**: 修复 CVE-2025-12819 漏洞，防止未授权攻击者在认证期间执行任意 SQL
-   ✅ **Bug 修复**:
    -   修复重新连接到服务器后临时 SCRAM 认证的错误
    -   修复缺少 SIMD 支持架构的 typedef
    -   修复客户端在发送数据前关闭连接时的警告日志
    -   修复潜在的 NULL 指针解引用和内存泄漏
    -   修复 SCRAM 解析服务器消息的问题

**PgBouncer 核心功能**:

-   ✅ **连接池管理**: 高效的 PostgreSQL 连接池
-   ✅ **事务模式**: 适合 Django 应用的事务级连接池
-   ✅ **性能优化**: 减少连接建立开销，提高并发处理能力

### Docker Compose v5.0.0 特性

**发布日期**: 2025 年 12 月 2 日

**核心变化**:

-   ✅ **官方 Go SDK**: 引入新的官方 Go SDK，提供完整的 API，允许开发者将 Compose 功能直接集成到应用中
-   ✅ **移除内部 BuildKit 构建器**: 内部 BuildKit 构建器已移除，构建操作现在委托给 Docker Buildx（也称为 Docker Bake）
-   ✅ **版本号调整**: 为避免与旧版 Compose 文件格式（v2、v3）混淆，版本号直接跳到 v5

**迁移注意事项**:

-   构建过程现在使用 Docker Buildx
-   如需集成 Compose 功能，可使用新的 Go SDK
-   向后兼容，现有 Compose 文件无需修改

---

## 架构设计

### 系统架构图

```
                    ┌─────────────┐
                    │   Internet  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx    │ (反向代理、SSL、静态文件)
                    │  (Alpine)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐
   │  Web 1  │      │    Web 2     │    │   Web N   │ (Django + Gunicorn)
   │(Gunicorn)│      │  (Gunicorn)  │    │(Gunicorn)│
   └────┬────┘      └──────┬──────┘    └─────┬─────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐
   │PostgreSQL│      │   PgBouncer │    │   Redis   │
   │    17    │◄─────│ (连接池)    │    │    8.0    │
   └──────────┘      └─────────────┘    └─────┬─────┘
                                               │
        ┌──────────────────────────────────────┼──────────────────┐
        │                                      │                  │
   ┌────▼────┐                          ┌─────▼─────┐    ┌─────▼─────┐
   │ Celery  │                          │  Celery   │    │  Celery   │
   │ Worker  │                          │   Beat    │    │  Monitor  │
   └─────────┘                          └───────────┘    └───────────┘
```

### 服务组件说明

#### 1. Nginx 反向代理层

-   **作用**:
    -   HTTP/HTTPS 请求处理
    -   SSL/TLS 终止
    -   静态文件和媒体文件服务
    -   负载均衡（多 Web 实例时）
    -   请求缓存
-   **配置**:
    -   Worker 进程数: auto（根据 CPU 核心数）
    -   Worker 连接数: 2048
    -   Gzip 压缩: 启用
    -   缓存: 静态文件缓存 30 天

#### 2. Django 应用层（Gunicorn）

-   **作用**:
    -   处理业务逻辑
    -   数据库操作
    -   缓存操作
    -   API 接口服务
-   **配置**:
    -   Worker 数量: CPU 核心数 × 2 + 1
    -   Worker 类型: sync（同步）
    -   超时时间: 30 秒
    -   最大请求数: 1000（自动重启）

#### 3. PostgreSQL 17 数据库层

-   **作用**:
    -   数据持久化
    -   事务处理
    -   数据查询
-   **配置**:
    -   最大连接数: 200
    -   共享缓冲区: 1GB
    -   有效缓存: 3GB
    -   工作内存: 10MB
    -   WAL 缓冲区: 16MB

#### 4. PgBouncer 连接池

-   **作用**:
    -   数据库连接池管理
    -   减少数据库连接开销
    -   提高并发处理能力
-   **配置**:
    -   池模式: transaction
    -   最大客户端连接: 1000
    -   默认池大小: 25
    -   最小池大小: 5

#### 5. Redis 8.0 缓存层

-   **作用**:
    -   缓存热点数据
    -   Celery 消息队列
    -   Session 存储
    -   限流和计数器
-   **配置**:
    -   最大内存: 2GB
    -   内存策略: allkeys-lru
    -   AOF 持久化: 启用
    -   保存策略: 900s 1 次, 300s 10 次, 60s 10000 次

#### 6. Celery 异步任务层

-   **作用**:
    -   异步任务处理
    -   定时任务调度
    -   邮件发送
    -   报表生成
-   **配置**:
    -   Worker 并发数: 4
    -   任务超时: 30 分钟
    -   队列: 默认、高优先级、低优先级

---

## 性能优化策略

### 1. 数据库优化

#### PostgreSQL 17 优化配置

```sql
-- 内存配置
shared_buffers = 1GB              -- 共享缓冲区（系统内存的 25%）
effective_cache_size = 3GB        -- 有效缓存（系统内存的 50-75%）
work_mem = 10MB                   -- 工作内存（每个查询操作）
maintenance_work_mem = 256MB     -- 维护操作内存

-- 写入优化
wal_buffers = 16MB                -- WAL 缓冲区
checkpoint_completion_target = 0.9 -- 检查点完成目标
min_wal_size = 1GB                -- 最小 WAL 大小
max_wal_size = 4GB                -- 最大 WAL 大小

-- 查询优化
default_statistics_target = 100   -- 统计信息目标
random_page_cost = 1.1            -- 随机页面成本（SSD）
effective_io_concurrency = 200    -- 有效 I/O 并发

-- 连接配置
max_connections = 200             -- 最大连接数
```

#### 索引优化

-   ✅ 为频繁查询的字段创建索引
-   ✅ 使用复合索引优化多字段查询
-   ✅ 定期执行 `ANALYZE` 更新统计信息
-   ✅ 使用 `EXPLAIN ANALYZE` 分析慢查询

#### 连接池优化（PgBouncer）

-   **Transaction 模式**: 适合 Django 应用
-   **连接复用**: 减少连接建立开销
-   **连接限制**: 防止连接数过多

### 2. 缓存优化

#### Redis 8.0 缓存策略

-   **缓存层级**:
    1. **L1 缓存**: Django 本地内存缓存（开发环境）
    2. **L2 缓存**: Redis 缓存（生产环境）
-   **缓存策略**:

    -   **热点数据**: 缓存用户信息、停车场信息等
    -   **查询结果**: 缓存复杂查询结果
    -   **Session**: 使用 Redis 存储 Session
    -   **限流**: 使用 Redis 实现 API 限流

-   **缓存失效**:
    -   TTL: 根据数据更新频率设置
    -   主动失效: 数据更新时清除相关缓存
    -   版本控制: 使用缓存版本号

#### Redis 配置优化

```conf
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
```

### 3. 应用层优化

#### Gunicorn 优化

-   **Worker 数量**: `CPU 核心数 × 2 + 1`
-   **Worker 类型**: sync（同步，适合 I/O 密集型）
-   **Preload**: 启用，减少内存使用
-   **Worker 临时目录**: `/dev/shm`（内存文件系统）

#### Django 优化

-   **数据库查询优化**:

    -   使用 `select_related()` 和 `prefetch_related()`
    -   避免 N+1 查询问题
    -   使用 `only()` 和 `defer()` 限制字段
    -   启用数据库查询缓存

-   **静态文件优化**:

    -   使用 `ManifestStaticFilesStorage`
    -   启用 Gzip 压缩
    -   设置长期缓存头

-   **中间件优化**:
    -   移除不必要的中间件
    -   优化中间件顺序
    -   使用缓存中间件

### 4. Nginx 优化

#### 性能配置

```nginx
worker_processes auto;           # 自动检测 CPU 核心数
worker_connections 2048;          # 每个 Worker 的连接数
use epoll;                        # 使用 epoll 事件模型
multi_accept on;                  # 一次接受多个连接
sendfile on;                      # 启用 sendfile
tcp_nopush on;                    # TCP 优化
tcp_nodelay on;                   # 禁用 Nagle 算法
keepalive_timeout 65;             # Keep-Alive 超时
```

#### 缓存配置

-   **静态文件缓存**: 30 天
-   **媒体文件缓存**: 7 天
-   **代理缓存**: 1GB，60 分钟失效

#### Gzip 压缩

-   压缩级别: 6
-   压缩类型: text, json, javascript, css, xml, svg, fonts

### 5. 异步任务优化

#### Celery 配置

-   **Worker 并发**: 4（根据任务类型调整）
-   **任务路由**: 按优先级分队列
-   **任务超时**: 30 分钟硬限制，25 分钟软限制
-   **Worker 重启**: 每 1000 个任务重启一次

---

## 高可用方案

### 1. 数据库高可用

#### PostgreSQL 主从复制

```yaml
# 主数据库
postgres_master:
    image: postgres:17-alpine
    environment:
        POSTGRES_REPLICATION_USER: replicator
        POSTGRES_REPLICATION_PASSWORD: replicator_password

# 从数据库
postgres_slave:
    image: postgres:17-alpine
    environment:
        PGUSER: replicator
        POSTGRES_MASTER_SERVICE_HOST: postgres_master
```

#### 读写分离

-   **写操作**: 主数据库
-   **读操作**: 从数据库（负载均衡）
-   **自动故障转移**: 使用 PgBouncer 或 HAProxy

### 2. Redis 高可用

#### Redis Sentinel（哨兵模式）

```yaml
redis_sentinel:
    image: redis:8-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
```

#### Redis 集群（大规模场景）

-   分片存储
-   自动故障转移
-   数据复制

### 3. 应用层高可用

#### 多实例部署

-   **水平扩展**: 部署多个 Web 实例
-   **负载均衡**: Nginx 或 HAProxy
-   **健康检查**: 自动剔除不健康实例

#### 容器编排

-   **Docker Swarm**: 简单场景
-   **Kubernetes**: 大规模场景
-   **自动扩缩容**: 根据负载自动调整实例数

---

## 安全配置

### 1. SSL/TLS 配置

#### Nginx SSL 配置

-   **协议**: TLSv1.2, TLSv1.3
-   **加密套件**: 仅使用强加密套件
-   **HSTS**: 启用，1 年有效期
-   **OCSP Stapling**: 启用

#### 证书管理

-   **Let's Encrypt**: 免费 SSL 证书
-   **自动续期**: 使用 Certbot
-   **证书轮换**: 定期更新证书

### 2. Django 安全配置

#### 生产环境设置

```python
DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com']
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

#### 安全中间件

-   SecurityMiddleware
-   CSRF 保护
-   XSS 保护
-   点击劫持保护

### 3. 数据库安全

#### PostgreSQL 安全

-   **强密码策略**: 使用复杂密码
-   **连接限制**: IP 白名单
-   **SSL 连接**: 启用 SSL
-   **定期备份**: 自动化备份

#### Redis 安全

-   **密码认证**: 设置 requirepass
-   **绑定地址**: 仅绑定内网地址
-   **禁用危险命令**: 重命名或禁用 FLUSHDB, FLUSHALL

### 4. 容器安全

#### Docker 安全最佳实践

-   **非 root 用户**: 应用以非 root 用户运行
-   **最小镜像**: 使用 Alpine 基础镜像
-   **安全扫描**: 定期扫描镜像漏洞（使用 Trivy）
-   **密钥管理**: 使用 Docker Secrets 或环境变量
-   **多阶段构建**: 分离构建时和运行时依赖

#### Web 应用防火墙 (WAF)

**ModSecurity + OWASP CRS**:

对于生产环境，建议在 Nginx 前部署 WAF 以防护常见 Web 攻击。

**部署方案**:
1. **使用 ModSecurity** (开源方案):
   - 集成 OWASP Core Rule Set (CRS)
   - 可自定义规则
   - 性能开销较大

2. **使用 NGINX App Protect** (商业方案):
   - 性能优异
   - 易于管理
   - 需要许可证

3. **使用云 WAF** (推荐):
   - AWS WAF、Cloudflare、阿里云 WAF
   - 无需维护
   - 自动更新规则

**当前建议**: 
-   小规模部署：使用 Nginx 限流和安全头
-   中大规模部署：考虑云 WAF 服务
-   企业级部署：使用 ModSecurity 或 NGINX App Protect

**Nginx 限流配置** (基础防护):
```nginx
# 限流配置
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

server {
    # API 限流
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        # ...
    }
    
    # 登录限流
    location /login/ {
        limit_req zone=login_limit burst=3 nodelay;
        # ...
    }
}
```

---

## 监控与日志

### 1. 监控架构

#### Prometheus 3.5.0 + Grafana 12.3.0 监控栈

**Prometheus 3.5.0 (LTS 版本)**:
-   **PromQL 增强**: 
    -   实验性类型和单位元数据标签（`type-and-unit-labels` 特性标志）
    -   新增 `ts_of_(min|max|last)_over_time` 函数（`experimental-promql-functions` 特性标志）
-   **抓取改进**: 
    -   新增全局选项 `always_scrape_classic_histograms`，允许抓取经典直方图
-   **OpenTelemetry 协议支持**: 
    -   新增配置选项 `promote_all_resource_attributes` 和 `ignore_resource_attributes`
-   **服务发现**: 
    -   新增 STACKIT Cloud 服务发现机制
-   指标收集和存储
-   服务发现
-   告警规则管理

**Grafana 12.3.0**:
-   **API 客户端增强**:
    -   添加延迟钩子
    -   自动设置 PATCH 头
    -   提取 API 客户端到独立包
    -   更新 API 客户端包含所有端点并添加钩子
-   可视化仪表板
-   告警通知
-   数据源集成

**监控指标**:
-   **应用指标**: 请求数、响应时间、错误率
-   **系统指标**: CPU、内存、磁盘、网络
-   **数据库指标**: 连接数、查询时间、缓存命中率
-   **业务指标**: 用户数、订单数、收入

#### 集成方案

```yaml
# docker-compose.prod.yml 中添加监控服务
  prometheus:
    image: prom/prometheus:v3.5.0
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--enable-feature=type-and-unit-labels'
      - '--enable-feature=experimental-promql-functions'
    networks:
      - app-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:12.3.0
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource
    ports:
      - "3000:3000"
    networks:
      - app-network
    depends_on:
      - prometheus
    restart: unless-stopped
```

### 2. 日志管理

#### Filebeat 9.2.2 日志收集

**Filebeat 9.2.2 特性**:
-   **DPoP 认证支持**: CEL 和 HTTP JSON 输入支持 DPoP（Demonstrating Proof-of-Possession）认证
-   **缓存处理器改进**: 改进日志记录，新增忽略失败选项
-   **FIPS 分发支持**: User Agent 包含 FIPS 分发信息
-   **Bug 修复**: 修复 Beats Receivers 中长 UTF-8 主机名截断导致的启动错误

**Filebeat 功能**:
-   轻量级日志收集器
-   支持多种输入源（文件、Docker、系统日志等）
-   支持输出到 Elasticsearch、Logstash、Kafka 等
-   自动发现和监控文件变化
-   结构化日志处理

**日志配置**:
```yaml
  filebeat:
    image: docker.elastic.co/beats/filebeat:9.2.2
    user: root
    volumes:
      - ./monitoring/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - filebeat_data:/usr/share/filebeat/data
    environment:
      - ELASTICSEARCH_HOSTS=${ELASTICSEARCH_HOSTS:-elasticsearch:9200}
      - LOGSTASH_HOSTS=${LOGSTASH_HOSTS:-logstash:5044}
    networks:
      - app-network
    depends_on:
      - elasticsearch
    restart: unless-stopped
```

**Filebeat 配置文件示例** (`monitoring/filebeat.yml`):
```yaml
filebeat.inputs:
  - type: container
    paths:
      - '/var/lib/docker/containers/*/*.log'
    processors:
      - add_docker_metadata:
          host: "unix:///var/run/docker.sock"

  - type: log
    enabled: true
    paths:
      - '/app/logs/*.log'
    fields:
      app: parking_management
      environment: production
    fields_under_root: false

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_docker_metadata: ~

output.elasticsearch:
  hosts: ['${ELASTICSEARCH_HOSTS}']
  indices:
    - index: "filebeat-%{+yyyy.MM.dd}"
  template.settings:
    index.number_of_shards: 1
    index.codec: best_compression

# 或者输出到 Logstash
# output.logstash:
#   hosts: ['${LOGSTASH_HOSTS}']

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
```

**与 Elasticsearch/Logstash 集成**:
-   **直接输出到 Elasticsearch**: 适合简单场景，Filebeat 直接写入 Elasticsearch
-   **通过 Logstash 处理**: 适合复杂场景，Logstash 进行数据转换和增强后再写入 Elasticsearch

#### 日志级别

-   **开发环境**: DEBUG
-   **生产环境**: INFO
-   **错误日志**: ERROR

#### 日志聚合

-   **集中式日志**: 使用 Filebeat + Elasticsearch/Logstash
-   **日志轮转**: 按大小和时间轮转
-   **日志保留**: 保留 30-90 天
-   **结构化日志**: JSON 格式，便于查询
-   **自动发现**: Filebeat 自动发现 Docker 容器日志

#### 结构化日志配置

**Django 日志配置** (`settings/prod.py`):
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d',
        },
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',  # 使用 JSON 格式
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'parking': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

**安装 JSON 日志格式化器**:
```bash
pip install python-json-logger
```

### 3. 错误追踪

#### Glitchtip 5.2.0 集成

**Glitchtip 5.2.0 特性**:
-   **设计刷新**: 
    -   更新 UI 以符合 Material Design 3 原则
    -   改进暗色模式支持
    -   新增问题列表页面图表，可视化过去 24 小时或两周的事件趋势
-   **安全改进**: 
    -   修复与 brotli 项目相关的拒绝服务（DOS）漏洞
    -   显著减少攻击期间的潜在内存消耗
-   **简化架构**: 
    -   实验性支持仅使用 PostgreSQL 作为数据库（无需 Valkey/Redis）
    -   通过设置 `VALKEY_URL` 为空字符串，使用 PostgreSQL 进行缓存、Celery 任务和会话
    -   减少 RAM 使用，可在 256MB RAM 上运行（性能有所权衡）
-   **社区贡献**: 
    -   支持独立控制社交认证注册和一般用户注册设置

**Glitchtip 功能**:
-   实时错误监控（Sentry 兼容）
-   堆栈跟踪
-   性能监控
-   发布跟踪
-   自托管，数据完全可控
-   兼容 Sentry 客户端 SDK

**Docker 部署配置**:
```yaml
  glitchtip:
    image: glitchtip/glitchtip:5.2.0
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/glitchtip
      - SECRET_KEY=${GLITCHTIP_SECRET_KEY}
      - VALKEY_URL=  # 空字符串，使用 PostgreSQL
      - EMAIL_URL=smtp://${EMAIL_HOST}:${EMAIL_PORT}?user=${EMAIL_HOST_USER}&password=${EMAIL_HOST_PASSWORD}
      - DEFAULT_FROM_EMAIL=${EMAIL_HOST_USER}
    volumes:
      - glitchtip_data:/app/media
    networks:
      - app-network
    depends_on:
      - db
    restart: unless-stopped

  glitchtip_worker:
    image: glitchtip/glitchtip:5.2.0
    command: celery -A glitchtip worker -l info
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/glitchtip
      - SECRET_KEY=${GLITCHTIP_SECRET_KEY}
      - VALKEY_URL=
    networks:
      - app-network
    depends_on:
      - db
      - glitchtip
    restart: unless-stopped

  glitchtip_beat:
    image: glitchtip/glitchtip:5.2.0
    command: celery -A glitchtip beat -l info
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/glitchtip
      - SECRET_KEY=${GLITCHTIP_SECRET_KEY}
      - VALKEY_URL=
    networks:
      - app-network
    depends_on:
      - db
      - glitchtip
    restart: unless-stopped
```

**Django 集成**（使用 Sentry SDK，兼容 Glitchtip）:
```python
# settings/prod.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

sentry_sdk.init(
    dsn=os.environ.get('GLITCHTIP_DSN'),  # Glitchtip DSN
    integrations=[
        DjangoIntegration(),
        CeleryIntegration(),
    ],
    traces_sample_rate=0.1,
    send_default_pii=False,
    environment='production',
)
```

### 4. 应用性能监控 (APM)

#### OpenTelemetry 集成

**功能**:
-   分布式追踪
-   性能分析
-   依赖关系映射
-   与 Glitchtip 集成

**Django 集成**:
```python
# settings/prod.py
from opentelemetry import trace
from opentelemetry.instrumentation.django import DjangoInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# 设置服务名称
resource = Resource(attributes={
    SERVICE_NAME: "parking-management"
})

# 配置追踪提供者
trace.set_tracer_provider(TracerProvider(resource=resource))
tracer_provider = trace.get_tracer_provider()

# 配置 OTLP 导出器（发送到 Glitchtip 或其他收集器）
otlp_exporter = OTLPSpanExporter(
    endpoint=os.environ.get('OTLP_ENDPOINT', 'http://localhost:4318')
)
span_processor = BatchSpanProcessor(otlp_exporter)
tracer_provider.add_span_processor(span_processor)

# 自动检测 Django
DjangoInstrumentor().instrument()

# 排除特定 URL
import os
os.environ['OTEL_PYTHON_DJANGO_EXCLUDED_URLS'] = 'healthcheck,/static/,/media/'
```

**安装依赖**:
```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-django
```

**初始化 Glitchtip**:
```bash
# 创建 Glitchtip 数据库
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -c "CREATE DATABASE glitchtip;"

# 运行迁移
docker-compose -f docker-compose.prod.yml exec glitchtip python manage.py migrate

# 创建超级用户
docker-compose -f docker-compose.prod.yml exec glitchtip python manage.py createsuperuser
```

### 4. 应用性能监控 (APM)

#### OpenTelemetry 集成

**功能**:
-   分布式追踪
-   性能分析
-   依赖关系映射

**Django 集成**:
```python
# 安装依赖
# pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-django

from opentelemetry import trace
from opentelemetry.instrumentation.django import DjangoInstrumentor

DjangoInstrumentor().instrument()
```

### 5. 告警系统

#### 告警规则

**Prometheus 告警规则**:
```yaml
# monitoring/alerts.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        annotations:
          summary: "P95 response time > 2s"
      
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 5m
        annotations:
          summary: "Database connections > 80%"
```

#### Prometheus 指标优化

**最佳实践**:
-   **指标聚合**: 使用 Recording Rules 聚合高频指标
-   **指标选择**: 避免收集过多不必要的指标
-   **采样率**: 对于高频率指标，使用采样
-   **保留策略**: 合理设置数据保留时间

**Recording Rules 示例** (`monitoring/recording_rules.yml`):
```yaml
groups:
  - name: application_aggregated
    interval: 30s
    rules:
      - record: http:requests:rate5m
        expr: rate(http_requests_total[5m])
      
      - record: http:errors:rate5m
        expr: rate(http_requests_total{status=~"5.."}[5m])
      
      - record: db:connections:ratio
        expr: pg_stat_database_numbackends / pg_settings_max_connections
```

**Prometheus 配置优化** (`monitoring/prometheus.yml`):
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    environment: 'prod'

# 数据保留
storage:
  tsdb:
    retention.time: 30d
    retention.size: 50GB

# 告警规则
rule_files:
  - "alerts.yml"
  - "recording_rules.yml"

# 抓取配置
scrape_configs:
  - job_name: 'django'
    scrape_interval: 15s
    static_configs:
      - targets: ['web:8000']
```

#### 告警通知

-   **邮件通知**: 发送到运维团队
-   **短信通知**: 紧急告警（使用阿里云、腾讯云等）
-   **钉钉/企业微信**: 集成企业 IM
-   **Slack/Telegram**: 集成团队协作工具
-   **PagerDuty**: 专业告警管理平台

---

## 备份与恢复

### 1. 数据库备份

#### pgBackRest 2.57.0 备份策略

**pgBackRest 2.57.0 特性**:
-   **Bug 修复**: 
    -   修复 HTTP/TLS/socket 超时问题
    -   修复页面校验和错误消息中的潜在段错误
-   **新功能**: 
    -   新增 `repo-symlink` 选项，抑制仓库符号链接的创建
-   **改进**: 
    -   为 408 和 429 错误实现 HTTP 重试

**pgBackRest 优势**:
-   支持全量、增量和差异备份
-   并行备份和恢复
-   压缩和加密支持
-   备份验证
-   归档管理

**pgBackRest 配置** (`postgres/pgbackrest.conf`):
```ini
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=7
repo1-retention-archive=14
log-level-console=info
log-level-file=debug
log-path=/var/log/pgbackrest

[parking_management]
pg1-path=/var/lib/postgresql/data
pg1-port=5432
pg1-user=postgres
```

**Docker 部署配置**:
```yaml
  pgbackrest:
    image: pgbackrest/pgbackrest:2.57.0
    volumes:
      - ./postgres/pgbackrest.conf:/etc/pgbackrest/pgbackrest.conf:ro
      - postgres_data:/var/lib/postgresql/data:ro
      - pgbackrest_repo:/var/lib/pgbackrest
      - pgbackrest_logs:/var/log/pgbackrest
    environment:
      - PGBACKREST_DB_PATH=/var/lib/postgresql/data
      - PGBACKREST_REPO_PATH=/var/lib/pgbackrest
    networks:
      - app-network
    depends_on:
      - db
    restart: unless-stopped
```

**备份命令**:
```bash
# 全量备份
docker-compose -f docker-compose.prod.yml exec pgbackrest \
  pgbackrest --stanza=parking_management --type=full backup

# 增量备份
docker-compose -f docker-compose.prod.yml exec pgbackrest \
  pgbackrest --stanza=parking_management --type=incr backup

# 差异备份
docker-compose -f docker-compose.prod.yml exec pgbackrest \
  pgbackrest --stanza=parking_management --type=diff backup

# 列出备份
docker-compose -f docker-compose.prod.yml exec pgbackrest \
  pgbackrest --stanza=parking_management info

# 恢复备份
docker-compose -f docker-compose.prod.yml exec pgbackrest \
  pgbackrest --stanza=parking_management restore
```

**自动化备份脚本**:
```bash
#!/bin/bash
# backup_pgbackrest.sh

RETENTION_FULL=7
RETENTION_ARCHIVE=14

# 执行增量备份
docker-compose -f docker-compose.prod.yml exec -T pgbackrest \
  pgbackrest --stanza=parking_management --type=incr backup

# 清理旧备份
docker-compose -f docker-compose.prod.yml exec -T pgbackrest \
  pgbackrest --stanza=parking_management expire

# 验证备份
docker-compose -f docker-compose.prod.yml exec -T pgbackrest \
  pgbackrest --stanza=parking_management check
```

#### WAL 归档和点-in-time 恢复 (PITR)

**配置 WAL 归档**:

1. **在 postgresql.conf 中启用归档**:
```ini
archive_mode = on
archive_command = 'pgbackrest --stanza=parking_management archive-push %p'
wal_level = replica  # 或 logical（如果需要逻辑复制）
```

2. **在 pgbackrest.conf 中配置**:
```ini
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=7
repo1-retention-archive=14
archive-async=y  # 异步归档，提高性能

[parking_management]
pg1-path=/var/lib/postgresql/data
pg1-port=5432
archive-push-queue-max=1GB
```

**PITR 恢复示例**:
```bash
# 恢复到指定时间点
docker-compose -f docker-compose.prod.yml exec pgbackrest \
  pgbackrest --stanza=parking_management \
  --type=time \
  --target="2025-12-15 14:30:00" \
  --target-action=promote \
  restore

# 恢复到指定事务ID
docker-compose -f docker-compose.prod.yml exec pgbackrest \
  pgbackrest --stanza=parking_management \
  --type=xid \
  --target="12345678" \
  restore
```

**优势**:
-   可以恢复到任意时间点（精确到秒）
-   最小化数据丢失
-   支持事务级恢复
-   适合关键业务系统

**备份脚本示例**:
```bash
#!/bin/bash
# backup_postgres.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
docker-compose -f docker-compose.prod.yml exec -T db pg_dump \
  -U postgres \
  -F c \
  parking_management > $BACKUP_DIR/parking_$DATE.dump

# 压缩备份
gzip $BACKUP_DIR/parking_$DATE.dump

# 删除旧备份（保留 30 天）
find $BACKUP_DIR -name "parking_*.dump.gz" -mtime +$RETENTION_DAYS -delete

# 上传到云存储（可选）
# aws s3 cp $BACKUP_DIR/parking_$DATE.dump.gz s3://backup-bucket/
```

#### 备份存储

-   **本地存储**: 保留最近 7 天的备份
-   **云存储**: 使用 AWS S3、阿里云 OSS 等存储长期备份
-   **异地备份**: 定期同步到异地数据中心

### 2. Redis 备份

#### AOF 持久化

Redis 8.4 已配置 AOF 持久化，数据自动保存到磁盘。

**手动备份**:
```bash
# 创建 Redis 快照
docker-compose -f docker-compose.prod.yml exec redis redis-cli BGSAVE

# 复制 AOF 文件
docker-compose -f docker-compose.prod.yml exec redis cp /data/appendonly.aof /backups/redis_$(date +%Y%m%d).aof
```

### 3. 媒体文件备份

#### 文件备份策略

```bash
#!/bin/bash
# backup_media.sh

MEDIA_DIR="/app/mediafiles"
BACKUP_DIR="/backups/media"
DATE=$(date +%Y%m%d)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 同步媒体文件
rsync -av --delete $MEDIA_DIR/ $BACKUP_DIR/media_$DATE/

# 压缩备份
tar -czf $BACKUP_DIR/media_$DATE.tar.gz -C $BACKUP_DIR media_$DATE

# 删除临时目录
rm -rf $BACKUP_DIR/media_$DATE
```

### 4. 恢复流程

#### 数据库恢复

```bash
# 停止应用
docker-compose -f docker-compose.prod.yml stop web

# 恢复数据库
docker-compose -f docker-compose.prod.yml exec -T db pg_restore \
  -U postgres \
  -d parking_management \
  -c \
  /backups/parking_20251215.dump

# 启动应用
docker-compose -f docker-compose.prod.yml start web
```

#### Redis 恢复

```bash
# 停止 Redis
docker-compose -f docker-compose.prod.yml stop redis

# 复制 AOF 文件
cp /backups/redis_20251215.aof /var/lib/docker/volumes/parking_redis_data/_data/appendonly.aof

# 启动 Redis
docker-compose -f docker-compose.prod.yml start redis
```

### 5. 备份验证

#### 定期测试恢复

-   **每月测试**: 在测试环境恢复备份，验证备份完整性
-   **自动化测试**: 使用脚本自动验证备份文件
-   **文档记录**: 记录恢复步骤和所需时间

---

## CI/CD 持续集成

### 1. CI/CD 工具选型

#### 推荐方案

| 工具           | 用途                 | 推荐理由                     |
| -------------- | -------------------- | ---------------------------- |
| **GitHub Actions** | CI/CD 流水线         | 与 GitHub 集成，免费额度高   |
| **GitLab CI/CD**   | CI/CD 流水线         | 自托管，功能完整             |
| **Docker Hub**     | 镜像仓库             | 官方支持，自动化构建         |
| **Harbor**         | 私有镜像仓库         | 企业级，支持镜像扫描         |

### 2. CI/CD 流水线设计

#### 阶段 1: 代码检查

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - name: Install dependencies
        run: |
          pip install uv
          uv sync
      - name: Run linter
        run: uv run ruff check .
      - name: Run type check
        run: uv run mypy parking/
```

#### 阶段 2: 自动化测试

```yaml
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17.7
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:8.4
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - name: Install dependencies
        run: |
          pip install uv
          uv sync
      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379/1
        run: uv run pytest --cov=parking --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

#### 阶段 3: 安全扫描

```yaml
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Bandit
        run: |
          pip install bandit
          bandit -r parking/ -f json -o bandit-report.json
      - name: Run Safety
        run: |
          pip install safety
          safety check --json
      - name: Scan Docker image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: parking-management:latest
          version: '0.68.1'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

#### CI/CD 安全最佳实践

**GitHub Secrets 管理**:
-   ✅ 使用 GitHub Secrets 存储所有敏感信息
-   ✅ 不要在代码或日志中暴露密钥
-   ✅ 定期轮换密钥和密码
-   ✅ 使用最小权限原则

**多阶段构建** (已在 Dockerfile 中实现):
-   ✅ 分离构建时和运行时依赖
-   ✅ 减少镜像大小
-   ✅ 提高安全性

**密钥管理示例**:
```yaml
# .github/workflows/deploy.yml
env:
  SECRET_KEY: ${{ secrets.SECRET_KEY }}
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  GLITCHTIP_DSN: ${{ secrets.GLITCHTIP_DSN }}
```

**Trivy 0.68.1 特性**:
-   **Bug 修复**:
    -   修复 VEX 中不使用重用 BOM 的问题
    -   修复 `rpc` 包中为 `BlobInfo` 添加 `buildInfo` 的问题
    -   修复 echo 检测器使用 `SrcVersion` 而不是 `Version` 的问题
    -   修复 `google.protobuf.Value` 的兼容性问题

**Trivy 功能**:
-   容器镜像漏洞扫描
-   文件系统扫描
-   Git 仓库扫描
-   CI/CD 集成
-   多种输出格式（JSON、SARIF、表格等）

#### 阶段 4: 构建镜像

```yaml
  build:
    runs-on: ubuntu-latest
    needs: [lint, test, security]
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            parking-management:latest
            parking-management:${{ github.sha }}
          cache-from: type=registry,ref=parking-management:buildcache
          cache-to: type=registry,ref=parking-management:buildcache,mode=max
```

#### 阶段 5: 部署

```yaml
  deploy:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/parking-management
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
```

### 3. 部署策略

#### 蓝绿部署

```yaml
# 蓝绿部署配置
services:
  web_blue:
    image: parking-management:latest
    # ... 配置
  web_green:
    image: parking-management:latest
    # ... 配置
```

#### 滚动更新

```bash
# 使用 Docker Compose 滚动更新
docker-compose -f docker-compose.prod.yml up -d --no-deps --build web
```

#### 回滚机制

```bash
# 回滚到上一个版本
docker-compose -f docker-compose.prod.yml pull parking-management:previous
docker-compose -f docker-compose.prod.yml up -d web
```

### 4. 环境管理

#### 环境分离

-   **开发环境**: 自动部署到开发服务器
-   **测试环境**: 自动部署到测试服务器
-   **生产环境**: 手动审批后部署

#### 环境变量管理

-   使用 GitHub Secrets 存储敏感信息
-   使用 `.env` 文件管理非敏感配置
-   使用配置管理工具（如 Vault）

### 5. 监控和通知

#### 部署通知

```yaml
  notify:
    runs-on: ubuntu-latest
    needs: [deploy]
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 部署步骤

### 1. 环境准备

#### 服务器要求

-   **CPU**: 4 核心以上（推荐 8 核心）
-   **内存**: 16GB 以上（推荐 32GB）
-   **磁盘**: 100GB 以上 SSD
-   **网络**: 100Mbps 以上带宽

#### 软件要求

-   Docker 20.10+
-   Docker Compose 2.0+
-   Git

### 2. 配置文件准备

#### 环境变量配置

```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑环境变量
vim .env.production
```

#### SSL 证书准备

```bash
# 使用 Let's Encrypt 获取证书
certbot certonly --standalone -d yourdomain.com

# 复制证书到 nginx/ssl 目录
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

### 3. 构建和启动

#### 构建镜像

```bash
docker-compose -f docker-compose.prod.yml build
```

#### 启动服务

```bash
# 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

#### 数据库迁移

```bash
# 执行数据库迁移
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate

# 创建超级用户
docker-compose -f docker-compose.prod.yml exec web python manage.py createsuperuser

# 收集静态文件
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
```

### 4. 验证部署

#### 健康检查

```bash
# 检查健康端点
curl http://localhost/health/

# 检查服务状态
docker-compose -f docker-compose.prod.yml ps
```

#### 性能测试

```bash
# 使用 Apache Bench 进行压力测试
ab -n 10000 -c 100 https://yourdomain.com/

# 使用 wrk 进行性能测试
wrk -t4 -c100 -d30s https://yourdomain.com/
```

---

## 扩展性规划

### 1. 水平扩展

#### Web 应用扩展

```yaml
# 扩展 Web 服务到 3 个实例
docker-compose -f docker-compose.prod.yml up -d --scale web=3
```

#### 数据库扩展

-   **读写分离**: 主从复制
-   **分库分表**: 按业务模块分库
-   **缓存层**: 增加 Redis 集群

### 2. 垂直扩展

#### 资源调整

-   **CPU**: 根据负载增加 CPU 核心数
-   **内存**: 增加内存容量
-   **磁盘**: 使用 SSD，增加 IOPS

### 3. 架构演进

#### 阶段 1: 单机部署（< 1 万用户）

-   单实例 Web
-   单数据库
-   单 Redis

#### 阶段 2: 多实例部署（1-10 万用户）

-   多 Web 实例 + Nginx 负载均衡
-   主从数据库
-   Redis 主从

#### 阶段 3: 分布式部署（10-100 万用户）

-   Kubernetes 集群
-   数据库分片
-   Redis 集群
-   CDN 加速

#### 阶段 4: 微服务架构（> 100 万用户）

-   服务拆分
-   API 网关
-   服务网格
-   消息队列集群

---

## 性能指标参考

### 目标性能指标（10 万用户）

| 指标           | 目标值      | 说明               |
| -------------- | ----------- | ------------------ |
| **响应时间**   | P95 < 500ms | 95% 的请求响应时间 |
| **吞吐量**     | > 1000 QPS  | 每秒处理请求数     |
| **并发用户**   | > 5000      | 同时在线用户数     |
| **数据库连接** | < 150       | 活跃数据库连接数   |
| **缓存命中率** | > 80%       | Redis 缓存命中率   |
| **错误率**     | < 0.1%      | HTTP 5xx 错误率    |
| **CPU 使用率** | < 70%       | 平均 CPU 使用率    |
| **内存使用率** | < 80%       | 平均内存使用率     |

### 容量规划

#### 10 万用户容量估算

-   **日活用户**: 20,000（20%）
-   **峰值并发**: 5,000（25% 日活）
-   **平均 QPS**: 500
-   **峰值 QPS**: 2,000
-   **数据存储**: 100GB（用户数据 + 日志）
-   **带宽需求**: 100Mbps

---

## 总结

本技术栈方案基于以下原则设计：

1. **高性能**: 使用最新版本数据库和缓存，优化配置
2. **高可用**: 多实例部署，主从复制，自动故障转移
3. **可扩展**: 支持水平扩展和垂直扩展
4. **安全性**: 完善的 SSL/TLS 配置和安全策略
5. **可维护**: 容器化部署，完善的监控和日志

通过合理的架构设计和性能优化，本方案可以支持 **10 万级别用户**的流畅运行。

---

---

## 技术栈总结

### 核心组件版本

-   **Django**: 5.2
-   **Python**: 3.13
-   **PostgreSQL**: 17.7
-   **Redis**: 8.4
-   **Nginx**: 1.29.4
-   **PgBouncer**: 1.25.1
-   **Docker Compose**: v5.0.0

### 扩展组件版本

-   **监控**: Prometheus 3.5.0 (LTS) + Grafana 12.3.0
-   **日志**: Filebeat 9.2.2
-   **错误追踪**: Glitchtip 5.2.0
-   **APM**: OpenTelemetry Latest
-   **备份**: pgBackRest 2.57.0
-   **CI/CD**: GitHub Actions Latest
-   **安全扫描**: Trivy 0.68.1

### 性能目标

-   **用户规模**: 10 万用户
-   **响应时间**: P95 < 500ms
-   **吞吐量**: > 1000 QPS
-   **可用性**: 99.9%

---

## 生产环境最佳实践

### 1. PostgreSQL 优化

#### 必须启用的扩展

-   ✅ **pg_stat_statements**: 查询性能监控和优化
-   ✅ **pg_trgm**: 全文搜索优化（如需要）

#### 备份策略

-   ✅ **WAL 归档**: 启用 WAL 归档支持 PITR
-   ✅ **定期备份**: 每日全量备份 + 每小时增量备份
-   ✅ **备份验证**: 定期测试恢复流程

#### 读取副本（可选）

**适用场景**:
-   读操作远多于写操作
-   需要地理分布
-   需要报表查询隔离

**配置示例**:
```yaml
  postgres_replica:
    image: postgres:17.7-alpine
    environment:
      POSTGRES_MASTER_SERVICE_HOST: postgres_master
    command: postgres -c hot_standby=on
```

### 2. Redis 优化

#### 安全配置

```conf
# redis.conf
requirepass ${REDIS_PASSWORD}
bind 127.0.0.1  # 仅绑定内网
protected-mode yes
rename-command FLUSHDB ""
rename-command FLUSHALL ""
```

#### 高可用选择

-   **< 10GB 数据**: Redis Sentinel
-   **> 10GB 数据**: Redis Cluster
-   **当前建议**: 先使用 Sentinel，后续按需升级

### 3. Celery 优化

#### 任务优先级

-   ✅ 使用专用队列分离高/中/低优先级任务
-   ✅ 为不同队列配置不同 Worker 数量
-   ✅ 监控队列长度，及时扩容

#### Broker 选择

-   **当前场景**: Redis 足够使用
-   **高吞吐量场景**: 考虑 RabbitMQ
-   **消息持久化要求**: 使用 RabbitMQ

### 4. Nginx 安全

#### 必须配置的安全头

-   ✅ Strict-Transport-Security (HSTS)
-   ✅ X-Frame-Options
-   ✅ X-Content-Type-Options
-   ✅ Content-Security-Policy
-   ✅ Referrer-Policy
-   ✅ Permissions-Policy

#### HTTP/2 和性能

-   ✅ 已启用 HTTP/2（Nginx 1.29.4 支持）
-   ✅ Gzip 压缩
-   ✅ 静态文件缓存
-   ✅ 连接池优化

### 5. Gunicorn 配置

#### 已实现的优化

-   ✅ 预加载应用 (`preload_app = True`)
-   ✅ Worker 临时目录使用 `/dev/shm`
-   ✅ 自动 Worker 重启
-   ✅ 合理的 Worker 数量计算

### 6. Docker 和容器

#### 当前方案

-   ✅ 多阶段构建（已实现）
-   ✅ 非 root 用户运行
-   ✅ 最小镜像（Alpine）
-   ✅ 健康检查

#### Kubernetes 迁移建议

**何时考虑迁移**:
-   服务数量 > 10 个
-   需要自动扩缩容
-   需要多区域部署
-   团队有 Kubernetes 经验

**当前建议**: 继续使用 Docker Compose，待规模扩大后再考虑 Kubernetes

### 7. 监控和日志

#### Prometheus 优化

-   ✅ 使用 Recording Rules 聚合指标
-   ✅ 合理设置数据保留时间
-   ✅ 避免收集过多不必要指标
-   ✅ 定期清理旧数据

#### 结构化日志

-   ✅ 使用 JSON 格式日志
-   ✅ Filebeat 自动收集
-   ✅ 集中式日志管理

#### OpenTelemetry 集成

-   ✅ 分布式追踪
-   ✅ 性能分析
-   ✅ 与 Glitchtip 集成

### 8. 安全加固

#### Django 安全

-   ✅ DEBUG = False
-   ✅ 所有安全中间件已启用
-   ✅ CSRF 保护
-   ✅ XSS 保护
-   ✅ 点击劫持保护

#### Redis 安全

-   ✅ 密码保护
-   ✅ 仅绑定内网
-   ✅ 禁用危险命令
-   ✅ 使用私有网络

#### WAF 部署

-   **小规模**: Nginx 限流 + 安全头
-   **中大规模**: 云 WAF 服务
-   **企业级**: ModSecurity 或 NGINX App Protect

### 9. CI/CD 安全

-   ✅ 使用 GitHub Secrets
-   ✅ 多阶段构建
-   ✅ 安全扫描（Trivy）
-   ✅ 代码质量检查

### 10. 总结

**已实现的最佳实践**:
-   ✅ pg_stat_statements 扩展
-   ✅ WAL 归档和 PITR
-   ✅ Celery 任务优先级
-   ✅ Nginx 安全头
-   ✅ Gunicorn 预加载
-   ✅ 多阶段 Docker 构建
-   ✅ 结构化日志
-   ✅ OpenTelemetry 集成
-   ✅ Redis 安全配置

**可选优化**（根据实际需求）:
-   ⚠️ PostgreSQL 读取副本（读多写少场景）
-   ⚠️ Redis Cluster（数据量 > 10GB）
-   ⚠️ RabbitMQ（高吞吐量或复杂路由）
-   ⚠️ Kubernetes（大规模部署）
-   ⚠️ WAF（高安全要求）

---

**文档维护**: HeZaoCha  
**最后更新**: 2025-12-15  
**版本**: 3.0.0
