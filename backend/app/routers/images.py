from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
import uuid
import os
from pathlib import Path

from app.config import settings
from app.services.image_service import ImageService

router = APIRouter(prefix="/images", tags=["图片管理"])


class UploadResponse(BaseModel):
    image_id: str
    file_name: str
    file_url: str
    file_size: int
    task_id: str
    message: str


@router.post("/upload", response_model=UploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    task_id: str = Form(...),
    user_id: int = Form(1),  # 后面改成从 JWT 获取
):
    """
    上传图片到指定任务
    - 图片直接保存到 /uploads/tasks/{task_id}/raw/
    - 元数据存入数据库
    - 返回图片唯一 ID
    """
    # 1. 验证任务是否存在且状态为 pending
    from app.database import AsyncSessionLocal
    from app.models.task import Task
    
    async with AsyncSessionLocal() as session:
        task = await session.get(Task, task_id)
        if not task:
            raise HTTPException(404, "任务不存在")
        
        if task.status != "pending":
            raise HTTPException(400, f"任务状态为 {task.status}，无法上传图片")
    
    # 2. 保存文件到任务目录
    file_info = await ImageService.save_upload_file(file, task_id)
    
    # 3. 保存记录到数据库
    image_id = await ImageService.create_image_record(
        task_id=task_id,
        user_id=user_id,
        file_info=file_info,
    )
    
    return UploadResponse(
        image_id=image_id,
        file_name=file_info["file_name"],
        file_url=file_info["file_url"],
        file_size=file_info["file_size"],
        task_id=task_id,
        message="上传成功"
    )


@router.get("/{image_id}")
async def get_image(image_id: str):
    """获取图片信息"""
    from app.database import AsyncSessionLocal
    from app.models.image import Image
    
    async with AsyncSessionLocal() as session:
        image = await session.get(Image, image_id)
        if not image:
            raise HTTPException(404, "图片不存在")
        
        return {
            "id": str(image.id),
            "task_id": str(image.task_id),
            "file_name": image.file_name,
            "file_url": image.file_url,
            "file_size": image.file_size,
            "type": image.type,
            "status": image.status,
            "parent_id": str(image.parent_id) if image.parent_id else None,
            "uploaded_at": image.uploaded_at,
        }