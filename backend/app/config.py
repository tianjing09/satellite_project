import os
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

class Settings:
    # 数据库
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://jingtian@localhost:5432/satellite_db")
    
    # Redis (Celery 用)
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # C 算法动态库
    C_LIB_PATH = os.getenv("C_LIB_PATH", "./lib/libsatellite.dylib")
    
    # 上传目录
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
    
    # 应用配置
    APP_NAME = "卫星轨迹提取系统"
    APP_VERSION = "1.0.0"
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"

settings = Settings()