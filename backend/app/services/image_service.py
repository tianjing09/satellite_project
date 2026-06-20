import os
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import UploadFile, HTTPException

from app.config import settings


class ImageService:
    @staticmethod
    async def save_upload_file(file: UploadFile, task_id: str) -> dict:
        """保存上传的图片文件到任务目录"""
        # 1. 验证文件类型
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(400, f"不支持的文件格式: {ext}")
        
        # 2. 读取文件内容
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(400, f"文件过大，最大支持 {settings.MAX_FILE_SIZE // 1024 // 1024}MB")
        
        # 3. 构建存储路径
        # /uploads/tasks/{task_id}/raw/{unique_id}{ext}
        task_dir = Path(settings.TASKS_DIR) / task_id / "raw"
        task_dir.mkdir(parents=True, exist_ok=True)
        
        unique_id = uuid.uuid4().hex[:16]
        safe_filename = f"{unique_id}{ext}"
        file_path = task_dir / safe_filename
        
        # 4. 保存文件
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 5. 构建 URL
        file_url = f"/uploads/tasks/{task_id}/raw/{safe_filename}"
        
        return {
            "file_path": str(file_path),
            "file_url": file_url,
            "file_size": len(content),
            "mime_type": file.content_type,
            "file_name": file.filename,
        }
    
    @staticmethod
    async def create_image_record(
        task_id: str,
        user_id: int,
        file_info: dict,
    ) -> str:
        """在数据库中创建图片记录"""
        from app.database import AsyncSessionLocal
        from app.models.image import Image
        
        image_id = str(uuid.uuid4())
        
        async with AsyncSessionLocal() as session:
            image = Image(
                id=image_id,
                task_id=task_id,
                user_id=user_id,
                file_name=file_info["file_name"],
                file_path=file_info["file_path"],
                file_url=file_info["file_url"],
                file_size=file_info["file_size"],
                mime_type=file_info["mime_type"],
                type="raw",
                status="uploaded",
            )
            session.add(image)
            await session.commit()
            
            # 更新任务的总图片数
            from app.models.task import Task
            task = await session.get(Task, task_id)
            if task:
                task.total_images += 1
                await session.commit()
        
        return image_id