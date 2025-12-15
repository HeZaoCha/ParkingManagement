"""
Celery 配置

异步任务队列配置
"""

import os
from celery import Celery

# 设置Django设置模块
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("parking_management")

# 从Django设置中加载配置
app.config_from_object("django.conf:settings", namespace="CELERY")

# 自动发现任务
app.autodiscover_tasks()

# Celery配置
app.conf.update(
    broker_url=os.environ.get("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0"),
    result_backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/0"),
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30分钟
    task_soft_time_limit=25 * 60,  # 25分钟
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    task_routes={
        "parking.tasks.*": {"queue": "parking"},
        "parking.tasks.high_priority.*": {"queue": "high_priority"},
        "parking.tasks.low_priority.*": {"queue": "low_priority"},
    },
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
)


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
