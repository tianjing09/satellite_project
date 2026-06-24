from celery import Celery
from app.config import settings

# 创建 Celery 实例
celery_app = Celery(
    "satellite_tracker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"]  # 自动发现任务
)

# 配置
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 小时超时
    task_soft_time_limit=3000,  # 50 分钟软超时
    worker_prefetch_multiplier=1,  # 一次只取一个任务
)