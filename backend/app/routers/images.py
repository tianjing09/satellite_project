from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
import uuid
import os
from pathlib import Path

from app.config import settings
from app.services.image_service import ImageService
from app.database import AsyncSessionLocal
from app.models.image import Image
from app.models.task import Task

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
    task_id: str = Form(...),  # 从表单接收，已经是字符串
    user_id: int = Form(1),
):
    """
    上传图片到指定任务
    """
    # 1. 验证任务是否存在且状态为 pending
    async with AsyncSessionLocal() as session:
        task = await session.get(Task, task_id)
        if not task:
            raise HTTPException(404, "任务不存在")
        
        if task.status != "pending":
            raise HTTPException(400, f"任务状态为 {task.status}，无法上传图片")
    
    # 2. 保存文件到任务目录
    file_info = await ImageService.save_upload_file(file, task_id)
    
    # 3. 生成图片 ID（字符串 UUID）
    image_id = str(uuid.uuid4())  # ← 这里生成字符串 UUID
    
    # 4. 保存记录到数据库
    async with AsyncSessionLocal() as session:
        image = Image(
            id=image_id,  # ← 字符串 UUID
            task_id=task_id,  # ← 已经是字符串
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
        
        # 更新任务的总图片数
        task = await session.get(Task, task_id)
        if task:
            task.total_images += 1
        
        await session.commit()
    
    return UploadResponse(
        image_id=image_id,
        file_name=file_info["file_name"],
        file_url=file_info["file_url"],
        file_size=file_info["file_size"],
        task_id=task_id,
        message="上传成功"
    )