# app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://jingtian@localhost:5432/satellite_db")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    C_LIB_PATH = os.getenv("C_LIB_PATH", "./lib/libsatellite.dylib")
    
    # 上传目录
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
    
    # 文件大小限制 (50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024
    
    # 允许的图片格式
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tiff", ".fits", ".fit"}
    
    APP_NAME = "卫星轨迹提取系统"
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"

settings = Settings()