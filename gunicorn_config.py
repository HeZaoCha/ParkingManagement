"""
Gunicorn 配置文件

用于生产环境部署
"""

import multiprocessing
import os

# 服务器配置
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 5
max_requests = 1000
max_requests_jitter = 50

# 日志配置
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# 进程命名
proc_name = "parking_management"

# 性能优化
preload_app = True
worker_tmp_dir = "/dev/shm"  # 使用内存文件系统提高性能

# 安全配置
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# 优雅重启
graceful_timeout = 30
