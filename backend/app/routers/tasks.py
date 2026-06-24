from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
from pathlib import Path

from app.database import get_db, AsyncSessionLocal
from app.config import settings
from app.models.task import Task
from app.models.image import Image

# 在文件开头添加导入
from app.services.c_algorithm import CAlgorithm
from app.worker.tasks import process_task as process_task_celery

router = APIRouter(prefix="/tasks", tags=["任务管理"])


# ========== Pydantic 模型 ==========

class TaskCreate(BaseModel):
    name: str                              # 用户自定义名称
    telescope_id: Optional[str] = None


class TaskResponse(BaseModel):
    task_id: str
    name: str
    status: str
    task_dir: str
    total_images: int
    message: str


class TaskProcessResponse(BaseModel):
    task_id: str
    status: str
    message: str


class TaskDetailResponse(BaseModel):
    task_id: str
    name: str
    status: str
    progress: int
    total_images: int
    success_count: int
    task_dir: str
    result: Optional[dict]
    created_at: datetime
    updated_at: datetime


# ========== API 接口 ==========

@router.post("/", response_model=TaskResponse)
async def create_task(
    data: TaskCreate,
    user_id: int = 1,  # 后面会改成从 JWT 获取
):
    """
    创建新任务
    - 用户自定义任务名称（可重复）
    - 创建任务目录
    - 返回 task_id
    """
    # task_id = str(uuid.uuid4())
    # 创建任务时使用字符串 UUID
    task_id = str(uuid.uuid4())  # 已经是字符串
    task_dir = Path(settings.TASKS_DIR) / task_id
    
    # 创建任务目录
    task_dir.mkdir(parents=True, exist_ok=True)
    (task_dir / "raw").mkdir(exist_ok=True)
    # (task_dir / "filtered").mkdir(exist_ok=True)
    # (task_dir / "enhanced").mkdir(exist_ok=True)
    
    # 创建任务记录
    async with AsyncSessionLocal() as session:
        task = Task(
            id=task_id,
            user_id=user_id,
            name=data.name,
            telescope_id=data.telescope_id,
            task_dir=str(task_dir),
            status="pending",
        )
        session.add(task)
        await session.commit()
    
    return TaskResponse(
        task_id=task_id,
        name=data.name,
        status="pending",
        task_dir=str(task_dir),
        total_images=0,
        message="任务创建成功，请上传图片"
    )

# 修改 process_task 路由
@router.post("/{task_id}/process", response_model=TaskProcessResponse)
async def process_task(
    task_id: str,
    background_tasks: BackgroundTasks,
):
    """
    开始处理任务（通过 Celery 异步执行）
    """
    async with AsyncSessionLocal() as session:
        task = await session.get(Task, task_id)
        if not task:
            raise HTTPException(404, "任务不存在")
        
        if task.status != "pending":
            raise HTTPException(400, f"任务状态为 {task.status}，无法处理")
        
        # 统计图片数量
        from sqlalchemy import func, select
        result = await session.execute(
            select(func.count(Image.id)).where(Image.task_id == task_id)
        )
        total_images = result.scalar()
        
        if total_images == 0:
            raise HTTPException(400, "任务没有图片，请先上传图片")
        
        # 更新任务状态
        task.status = "processing"
        task.total_images = total_images
        task.updated_at = func.now()
        await session.commit()
    
    # ========== 关键：提交 Celery 任务 ==========
    # 替换原来的 background_tasks.add_task(simulate_process, task_id)
    # background_tasks.add_task(process_task_with_c, task_id)
    process_task_celery.delay(task_id)
    
    return TaskProcessResponse(
        task_id=task_id,
        status="processing",
        message="任务已提交到队列，请稍后查询结果"
    )


# app/routers/tasks.py
@router.get("/{task_id}")
async def get_task(task_id: str):
    """查询任务详情"""
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        from app.models.task import Task
        from app.models.image import Image
        
        # 查询任务
        task = await session.get(Task, task_id)
        if not task:
            raise HTTPException(404, "任务不存在")
        
        # 查询该任务下的所有图片（包括 raw, filtered, enhanced）
        result = await session.execute(
            select(Image).where(Image.task_id == task_id).order_by(Image.uploaded_at)
        )
        images = result.scalars().all()
    
    # 按类型分组
    raw_images = []
    filtered_images = []
    enhanced_images = []
    
    for img in images:
        img_data = {
            "id": str(img.id),
            "file_name": img.file_name,
            "file_url": img.file_url,
            "type": img.type,
            "status": img.status,
            "parent_id": str(img.parent_id) if img.parent_id else None,
            "error_message": img.error_message,
        }
        if img.type == "raw":
            raw_images.append(img_data)
        elif img.type == "filtered":
            filtered_images.append(img_data)
        elif img.type == "enhanced":
            enhanced_images.append(img_data)
    
    # 构建返回数据
    return {
        "task": {
            "id": str(task.id),
            "name": task.name,
            "status": task.status,
            "step": task.step if hasattr(task, 'step') else 0,  # ← 添加 step
            "progress": task.progress,
            "total_images": task.total_images,
            "success_count": task.success_count,
            "task_dir": task.task_dir,
            "result": task.result,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
        },
        "images": {
            "raw": raw_images,
            "filtered": filtered_images,
            "enhanced": enhanced_images,
        }
    }

@router.get("/")
async def list_tasks(
    user_id: int = 1,
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None,
):
    """获取用户的所有任务列表"""
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        from app.models.task import Task
        
        query = select(Task).where(Task.user_id == user_id)
        
        if status:
            query = query.where(Task.status == status)
        
        query = query.order_by(Task.created_at.desc()).limit(limit).offset(offset)
        
        result = await session.execute(query)
        tasks = result.scalars().all()
    
    return {
        "total": len(tasks),
        "tasks": [
            {
                "id": str(t.id),
                "name": t.name,
                "status": t.status,
                "progress": t.progress,
                "total_images": t.total_images,
                "success_count": t.success_count,
                "created_at": t.created_at,
            }
            for t in tasks
        ]
    }


# ========== 模拟处理（后面替换为 Celery） ==========

async def simulate_process(task_id: str):
    """模拟后台处理"""
    import asyncio
    import json
    from app.database import AsyncSessionLocal
    from app.models.task import Task
    from app.models.image import Image
    
    # 模拟 5 步处理
    steps = [
        (20, "加载图片"),
        (40, "去恒星处理"),
        (60, "去噪声处理"),
        (80, "轨迹拟合"),
        (100, "生成结果"),
    ]
    
    async with AsyncSessionLocal() as session:
        task = await session.get(Task, task_id)
        if not task:
            return
        
        for progress, message in steps:
            await asyncio.sleep(2)  # 模拟耗时
            
            # 更新进度
            task.progress = progress
            await session.commit()
        
        # 模拟处理完成
        task.status = "completed"
        task.progress = 100
        task.success_count = task.total_images
        task.result = {
            "total_tracks": 6,
            "tracks": [
                {"norad_id": 25544, "name": "国际空间站", "points": [[116.4, 39.9], [117.2, 40.5]]},
                {"norad_id": 33591, "name": "风云三号", "points": [[120.1, 31.2], [121.0, 31.8]]},
            ]
        }
        await session.commit()


# 在 simulate_process 中调用 C 算法
async def process_task_with_c(task_id: str):
    """使用 C 算法处理任务"""
    from app.database import AsyncSessionLocal
    from app.models.task import Task
    from app.models.image import Image
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as session:
        # 1. 获取任务
        task = await session.get(Task, task_id)
        if not task:
            return
        
        try:
            # 2. 获取所有 raw 图片
            result = await session.execute(
                select(Image).where(
                    Image.task_id == task_id,
                    Image.type == "raw"
                )
            )
            images = result.scalars().all()
            
            if not images:
                task.status = "failed"
                task.error_message = "没有找到原始图片"
                await session.commit()
                return
            
            # 3. 准备路径
            image_paths = [img.file_path for img in images]
            output_dir = Path(task.task_dir) / "filtered"
            
            # 4. 创建进度回调
            def on_progress(step, message, progress, error_code, error_msg, data, current, total):
                # 更新任务进度
                task.progress = progress
                # 这里可以存储到数据库或通过 WebSocket 推送
            
            # 5. 调用 C 算法
            c_algo = CAlgorithm()
            result = c_algo.process_images(
                image_paths=image_paths,
                output_dir=str(output_dir),
                progress_callback=on_progress
            )
            
            # 6. 处理结果
            if result.get("status") == "success":
                # 更新任务
                task.status = "completed"
                task.progress = 100
                task.success_count = result.get("processed", 0)
                task.result = result
                
                # TODO: 为每张 filtered 图片插入记录
                # 遍历 result["results"]，插入 filtered 类型的图片记录
                
            else:
                task.status = "failed"
                task.error_message = result.get("message", "处理失败")
            
            await session.commit()
            
        except Exception as e:
            task.status = "failed"
            task.error_message = str(e)
            await session.commit()
            raise