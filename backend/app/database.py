# cd ~/Desktop/satellite_project/backend

# python << 'EOF'
# import asyncio
# from app.database import engine, Base
# import app.models.task
# import app.models.image

# async def create_tables():
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)
#     print("✅ 表创建成功！")

# asyncio.run(create_tables())
# EOF

# % which python3
# /usr/local/bin/python3
# (base) jingtian@jingdeMacBook-Pro backend % which python 
# /opt/anaconda3/bin/python

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# 创建异步数据库引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20
)

# 创建异步 Session 工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# ORM 模型基类
Base = declarative_base()

# 依赖注入：获取数据库会话
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()