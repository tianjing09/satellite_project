# http://localhost:8000/test-db
# cd ~/Desktop/satellite_project/backend
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import os

from app.routers import images, tasks
from app.database import get_db
from app.config import settings

app = FastAPI(
    title="卫星轨迹提取系统",
    description="基于 FastAPI + PostgreSQL + Celery 的卫星轨迹提取后端",
    version="1.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(images.router)
app.include_router(tasks.router)

# 挂载静态文件目录（让图片可以通过 URL 访问）
# upload_path = os.path.join(settings.UPLOAD_DIR, "images")
# if os.path.exists(upload_path):
#     app.mount("/uploads/images", StaticFiles(directory=upload_path), name="uploads")
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ========== 健康检查接口 ==========
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "卫星轨迹提取系统运行正常"}


@app.get("/")
async def root():
    return {
        "message": "卫星轨迹提取系统 API",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/test-db")
async def test_db(db: AsyncSession = Depends(get_db)):
    """测试数据库连接"""
    try:
        result = await db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "数据库连接正常"}
    except Exception as e:
        return {"status": "error", "message": str(e)}