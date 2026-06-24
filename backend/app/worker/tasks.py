# app/worker/tasks.py

import asyncio
import json
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
from celery import Task

from app.worker.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.task import Task as TaskModel
from app.models.image import Image
from app.services.c_algorithm import CAlgorithm
from sqlalchemy import select, func


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
        loop = asyncio.get_event_loop()
        if loop.is_running():
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
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise


async def _process_task_async(task_id: str, celery_task: Task):
    """异步执行任务的核心逻辑"""
    # 用独立的事务来处理每一步
    async with AsyncSessionLocal() as session:
        # 1. 获取任务
        task = await session.get(TaskModel, task_id)
        if not task:
            return {"status": "failed", "error": "任务不存在"}
        
        try:
            # 2. 更新状态为处理中
            task.status = "processing"
            task.step = 0
            task.progress = 0
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
            output_dir = Path(task.task_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # 5. 创建图片路径到 ID 的映射
            path_to_image = {img.file_path: img for img in images}
            
            # ============================================================
            # 6. 进度回调 - 使用独立事务，避免与主事务冲突
            # ============================================================
            async def update_step_in_db(step: int, progress: int):
                """在独立事务中更新 step 和 progress"""
                async with AsyncSessionLocal() as db_session:
                    db_task = await db_session.get(TaskModel, task_id)
                    if db_task:
                        db_task.step = step
                        db_task.progress = progress
                        await db_session.commit()
            
            def on_progress(step, message, progress, error_code, error_msg, data, current, total):
                """C 算法进度回调 - 实时更新数据库"""
                # 更新 Celery 任务状态
                celery_task.update_state(
                    state="PROGRESS",
                    meta={
                        "step": step,
                        "message": message,
                        "current": current,
                        "total": total,
                        "error_code": error_code,
                        "error_msg": error_msg
                    }
                )
                
                # 使用独立事务更新数据库
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        loop.create_task(update_step_in_db(step, step * 20))
                    else:
                        loop.run_until_complete(update_step_in_db(step, step * 20))
                except Exception as e:
                    print(f"更新进度失败: {e}")
            
            # 7. 调用 C 算法
            c_algo = CAlgorithm()
            c_result = c_algo.process_images(
                image_paths=image_paths,
                output_dir=str(output_dir),
                progress_callback=on_progress
            )
            
            # 8. 处理结果
            if c_result and c_result.get("status") == "success":
                task.status = "completed"
                task.progress = 100
                task.step = 5
                task.success_count = c_result.get("success_count", 0)
                task.total_images = c_result.get("total", len(images))
                task.result = c_result.get("tracks")
                
                # 为每张成功处理的图片插入 filtered 和 enhanced 记录
                for item in c_result.get("results", []):
                    original_path = item.get("original")
                    original_img = path_to_image.get(original_path)
                    
                    if not original_img:
                        continue
                    
                    if item.get("status") == "ok":
                        original_img.status = "completed"
                        
                        filtered_path = item.get("filtered")
                        if filtered_path:
                            filtered_filename = Path(filtered_path).name
                            filtered_img = Image(
                                id=str(uuid.uuid4()),
                                task_id=task_id,
                                user_id=task.user_id,
                                file_name=filtered_filename,
                                file_path=filtered_path,
                                file_url=f"/uploads/tasks/{task_id}/filtered/{filtered_filename}",
                                type="filtered",
                                parent_id=str(original_img.id),
                                status="completed"
                            )
                            session.add(filtered_img)
                        
                        enhanced_path = item.get("enhanced")
                        if enhanced_path:
                            enhanced_filename = Path(enhanced_path).name
                            enhanced_img = Image(
                                id=str(uuid.uuid4()),
                                task_id=task_id,
                                user_id=task.user_id,
                                file_name=enhanced_filename,
                                file_path=enhanced_path,
                                file_url=f"/uploads/tasks/{task_id}/enhanced/{enhanced_filename}",
                                type="enhanced",
                                parent_id=original_img.id,
                                status="completed"
                            )
                            session.add(enhanced_img)
                    else:
                        original_img.status = "failed"
                        original_img.error_message = item.get("error", "处理失败")
                
                await session.commit()
                
                return {
                    "status": "completed",
                    "success_count": task.success_count,
                    "total_images": task.total_images,
                    "tracks": task.result
                }
                
            else:
                task.status = "failed"
                task.error_message = c_result.get("message", "处理失败") if c_result else "C 算法返回空结果"
                await session.commit()
                return {"status": "failed", "error": task.error_message}
                
        except Exception as e:
            await session.rollback()
            
            # 用新事务更新任务状态为失败
            async with AsyncSessionLocal() as db_session:
                db_task = await db_session.get(TaskModel, task_id)
                if db_task:
                    db_task.status = "failed"
                    db_task.error_message = str(e)
                    await db_session.commit()
            
            raise