import asyncio
import json
import uuid
from pathlib import Path
from celery import Task

from app.worker.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.task import Task as TaskModel
from app.models.image import Image
from app.services.c_algorithm import CAlgorithm
from app.config import settings
from sqlalchemy import select, func
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 创建同步引擎（用于 Celery 回调中更新数据库）
SYNC_DATABASE_URL = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
SYNC_ENGINE = create_engine(SYNC_DATABASE_URL)
SyncSessionLocal = sessionmaker(bind=SYNC_ENGINE)

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
            # 6. 进度回调 - 实时更新数据库，并在 Step 1/2 时插入图片
            # ============================================================
            def on_progress(step, message, progress, error_code, error_msg, data, current, total):
                """C 算法进度回调 - 实时更新数据库"""
                print(f"📊 on_progress 被调用: step={step}, message={message[:50]}...")
                
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
                
                # 使用同步方式更新数据库（避免异步事务冲突）
                try:
                    with SyncSessionLocal() as db_session:
                        # 更新任务的 step 和 progress
                        db_task = db_session.query(TaskModel).filter(TaskModel.id == task_id).first()
                        if db_task:
                            db_task.step = step
                            db_task.progress = step * 20
                            db_session.commit()
                            print(f"✅ 同步更新数据库 step={step}, progress={step * 20}")
                        else:
                            print(f"❌ 未找到任务: {task_id}")
                        
                        # ========== Step 1 完成时插入 filtered 图片 ==========
                        if step == 1 and data:
                            print(f"📸 Step 1 完成，准备插入 filtered 图片: {data}")
                            
                            # 通过 data（filtered 路径）找到对应的原图
                            filtered_path = data
                            original_img = None
                            
                            # 方法1: 通过路径映射查找
                            # filtered 路径格式: .../filtered/xxx_filtered.jpg
                            # 原图路径格式: .../raw/xxx.png
                            filtered_filename = Path(filtered_path).stem  # xxx_filtered
                            for img_path, img_obj in path_to_image.items():
                                img_stem = Path(img_path).stem
                                if img_stem in filtered_filename:
                                    original_img = img_obj
                                    break
                            
                            if original_img:
                                # 检查是否已存在（避免重复插入）
                                existing = db_session.query(Image).filter(
                                    Image.task_id == task_id,
                                    Image.parent_id == original_img.id,
                                    Image.type == "filtered"
                                ).first()
                                
                                if not existing:
                                    filtered_filename_full = Path(filtered_path).name
                                    new_image = Image(
                                        id=str(uuid.uuid4()),
                                        task_id=task_id,
                                        user_id=db_task.user_id,
                                        file_name=filtered_filename_full,
                                        file_path=filtered_path,
                                        file_url=f"/uploads/tasks/{task_id}/filtered/{filtered_filename_full}",
                                        type="filtered",
                                        parent_id=original_img.id,
                                        status="completed"
                                    )
                                    db_session.add(new_image)
                                    db_session.commit()
                                    print(f"✅ 实时插入 filtered 图片: {filtered_filename_full}")
                                else:
                                    print(f"⏭️ filtered 图片已存在，跳过插入")
                            else:
                                print(f"❌ 找不到 filtered 对应的原图: {filtered_path}")
                        
                        # ========== Step 2 完成时插入 enhanced 图片 ==========
                        if step == 2 and data:
                            print(f"🔍 Step 2 完成，准备插入 enhanced 图片: {data}")
                            
                            enhanced_path = data
                            original_img = None
                            
                            enhanced_filename = Path(enhanced_path).stem
                            for img_path, img_obj in path_to_image.items():
                                img_stem = Path(img_path).stem
                                if img_stem in enhanced_filename:
                                    original_img = img_obj
                                    break
                            
                            if original_img:
                                # 检查是否已存在
                                existing = db_session.query(Image).filter(
                                    Image.task_id == task_id,
                                    Image.parent_id == original_img.id,
                                    Image.type == "enhanced"
                                ).first()
                                
                                if not existing:
                                    enhanced_filename_full = Path(enhanced_path).name
                                    new_image = Image(
                                        id=str(uuid.uuid4()),
                                        task_id=task_id,
                                        user_id=db_task.user_id,
                                        file_name=enhanced_filename_full,
                                        file_path=enhanced_path,
                                        file_url=f"/uploads/tasks/{task_id}/enhanced/{enhanced_filename_full}",
                                        type="enhanced",
                                        parent_id=original_img.id,
                                        status="completed"
                                    )
                                    db_session.add(new_image)
                                    db_session.commit()
                                    print(f"✅ 实时插入 enhanced 图片: {enhanced_filename_full}")
                                else:
                                    print(f"⏭️ enhanced 图片已存在，跳过插入")
                            else:
                                print(f"❌ 找不到 enhanced 对应的原图: {enhanced_path}")
                        
                except Exception as e:
                    print(f"❌ 同步更新数据库失败: {e}")
                    import traceback
                    traceback.print_exc()
            
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
                
                # 为每张成功处理的图片更新状态（如果 Step 1/2 已经插入，这里更新状态即可）
                for item in c_result.get("results", []):
                    original_path = item.get("original")
                    original_img = path_to_image.get(original_path)
                    
                    if not original_img:
                        continue
                    
                    if item.get("status") == "ok":
                        original_img.status = "completed"
                        
                        # 检查并插入 filtered（如果 Step 1 回调没有成功插入）
                        filtered_path = item.get("filtered")
                        if filtered_path:
                            # 检查是否已存在
                            existing = await session.execute(
                                select(Image).where(
                                    Image.task_id == task_id,
                                    Image.parent_id == original_img.id,
                                    Image.type == "filtered"
                                )
                            )
                            if not existing.scalar_one_or_none():
                                filtered_filename = Path(filtered_path).name
                                filtered_img = Image(
                                    id=str(uuid.uuid4()),
                                    task_id=task_id,
                                    user_id=task.user_id,
                                    file_name=filtered_filename,
                                    file_path=filtered_path,
                                    file_url=f"/uploads/tasks/{task_id}/filtered/{filtered_filename}",
                                    type="filtered",
                                    parent_id=original_img.id,
                                    status="completed"
                                )
                                session.add(filtered_img)
                                print(f"✅ 兜底插入 filtered 图片: {filtered_filename}")
                        
                        # 检查并插入 enhanced（如果 Step 2 回调没有成功插入）
                        enhanced_path = item.get("enhanced")
                        if enhanced_path:
                            # 检查是否已存在
                            existing = await session.execute(
                                select(Image).where(
                                    Image.task_id == task_id,
                                    Image.parent_id == original_img.id,
                                    Image.type == "enhanced"
                                )
                            )
                            if not existing.scalar_one_or_none():
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
                                print(f"✅ 兜底插入 enhanced 图片: {enhanced_filename}")
                    else:
                        original_img.status = "failed"
                        original_img.error_message = item.get("error", "处理失败")
                        print(f"❌ 图片处理失败: {original_path}")
                
                await session.commit()
                print(f"✅ 任务 {task_id} 处理完成！")
                
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
            print(f"❌ 任务处理异常: {e}")
            import traceback
            traceback.print_exc()
            
            # 用新事务更新任务状态为失败
            async with AsyncSessionLocal() as db_session:
                db_task = await db_session.get(TaskModel, task_id)
                if db_task:
                    db_task.status = "failed"
                    db_task.error_message = str(e)
                    await db_session.commit()
            
            raise