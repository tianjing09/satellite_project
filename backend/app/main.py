# brew services start postgresql@18
# brew services start redis
# redis-cli ping
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db

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

# 健康检查接口
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "卫星轨迹提取系统运行正常"}

# 根路径
@app.get("/")
async def root():
    return {
        "message": "卫星轨迹提取系统 API",
        "docs": "/docs",
        "health": "/health"
    }

# 新增：测试数据库连接接口
@app.get("/test-db")
async def test_db(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "数据库连接正常"}
    except Exception as e:
        return {"status": "error", "message": str(e)}