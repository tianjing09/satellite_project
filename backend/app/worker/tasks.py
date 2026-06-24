import asyncio
import json
from pathlib import Path
from celery import Task
from sqlalchemy import select

from app.worker.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.task import Task as TaskModel
from app.models.image import Image
from app.services.c_algorithm import CAlgorithm


class ProcessTask(Task):
    """自定义任务类，支持异步"""
    _async_session = None
    
    async def get_session(self):
        if self._async_session is None:
            self._async_session = AsyncSessionLocal()
        return self._async_session


@celery_app.task(bind=True, base=ProcessTask, name="process_task")
def process_task(self, task_id: str):
    """
    Celery 任务：处理卫星轨迹提取
    """
    try:
        # 在 Celery 中运行异步代码
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # 如果事件循环正在运行，创建新任务
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    _process_task_async(task_id, self)
                )
                return future.result()
        else:
            return loop.run_until_complete(_process_task_async(task_id, self))
            
    except Exception as e:
        # 更新任务状态为失败
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise


async def _process_task_async(task_id: str, celery_task: Task):
    """异步执行任务的核心逻辑"""
    async with AsyncSessionLocal() as session:
        # 1. 获取任务
        task = await session.get(TaskModel, task_id)
        if not task:
            return {"status": "failed", "error": "任务不存在"}
        
        try:
            # 2. 更新状态为处理中
            task.status = "processing"
            await session.commit()
            
            # 3. 获取所有 raw 图片
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
                return {"status": "failed", "error": "没有找到原始图片"}
            
            # 4. 准备路径
            image_paths = [img.file_path for img in images]
            output_dir = Path(task.task_dir) / "filtered"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # 5. 进度回调（更新数据库）
            def on_progress(step, message, progress, error_code, error_msg, data, current, total):
                # Celery 任务更新进度（前端轮询时能看到）
                celery_task.update_state(
                    state="PROGRESS",
                    meta={
                        "step": step,
                        "message": message,
                        "progress": progress,
                        "current": current,
                        "total": total,
                        "error_code": error_code,
                        "error_msg": error_msg
                    }
                )
                
                # 同步更新数据库（需要异步执行）
                async def update_db():
                    async with AsyncSessionLocal() as db_session:
                        db_task = await db_session.get(TaskModel, task_id)
                        if db_task:
                            db_task.progress = progress
                            await db_session.commit()
                
                try:
                    # 在 Celery 中运行异步更新
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        loop.create_task(update_db())
                    else:
                        loop.run_until_complete(update_db())
                except:
                    pass
            
            # 6. 调用 C 算法
            c_algo = CAlgorithm()
            result = c_algo.process_images(
                image_paths=image_paths,
                output_dir=str(output_dir),
                progress_callback=on_progress
            )
            
            # 7. 处理结果
            if result.get("status") == "success":
                task.status = "completed"
                task.progress = 100
                task.success_count = result.get("success_count", 0)
                task.result = result.get("tracks")
                
                # 为每张成功处理的图片插入 filtered 记录
                for item in result.get("results", []):
                    if item.get("status") == "ok" and item.get("output"):
                        original = await session.execute(
                            select(Image).where(
                                Image.task_id == task_id,
                                Image.file_path == item["original"],
                                Image.type == "raw"
                            )
                        )
                        original_img = original.scalar_one_or_none()
                        
                        if original_img:
                            import uuid
                            filtered_img = Image(
                                id=str(uuid.uuid4()),
                                task_id=task_id,
                                user_id=task.user_id,
                                file_name=f"{original_img.file_name}_filtered.jpg",
                                file_path=item["output"],
                                file_url=f"/uploads/tasks/{task_id}/filtered/{Path(item['output']).name}",
                                type="filtered",
                                parent_id=original_img.id,
                                status="completed"
                            )
                            session.add(filtered_img)
                
                await session.commit()
                
                return {
                    "status": "completed",
                    "success_count": task.success_count,
                    "tracks": task.result
                }
                
            else:
                task.status = "failed"
                task.error_message = result.get("message", "处理失败")
                await session.commit()
                return {"status": "failed", "error": task.error_message}
                
        except Exception as e:
            task.status = "failed"
            task.error_message = str(e)
            await session.commit()
            raise