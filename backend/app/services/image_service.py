import os
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import UploadFile, HTTPException

from app.config import settings
from app.database import AsyncSessionLocal


class ImageService:
    @staticmethod
    async def save_upload_file(file: UploadFile) -> dict:
        """保存上传的图片文件"""
        # 1. 验证文件类型
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(400, f"不支持的文件格式: {ext}")
        
        # 2. 验证文件大小（读取前5MB检查，实际大小在保存后确认）
        # 先读取一部分检查
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(400, f"文件过大，最大支持 {settings.MAX_FILE_SIZE // 1024 // 1024}MB")
        
        # 3. 生成存储路径
        upload_dir = Path(settings.UPLOAD_DIR) / "images"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # 按日期创建子目录
        date_path = datetime.now().strftime("%Y/%m/%d")
        target_dir = upload_dir / date_path
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # 生成唯一文件名
        unique_id = uuid.uuid4().hex[:16]
        safe_filename = f"{unique_id}{ext}"
        file_path = target_dir / safe_filename
        
        # 4. 保存文件
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 5. 构建 URL
        file_url = f"/uploads/images/{date_path}/{safe_filename}"
        
        return {
            "file_path": str(file_path),
            "file_url": file_url,
            "file_size": len(content),
            "mime_type": file.content_type,
            "file_name": file.filename,
        }
    
    @staticmethod
    async def create_image_record(
        user_id: int,
        file_info: dict,
        telescope_id: Optional[str] = None
    ) -> str:
        """在数据库中创建图片记录"""
        from app.models.image import Image
        
        async with AsyncSessionLocal() as session:
            image = Image(
                user_id=user_id,
                telescope_id=telescope_id,
                file_name=file_info["file_name"],
                file_path=file_info["file_path"],
                file_url=file_info["file_url"],
                file_size=file_info["file_size"],
                mime_type=file_info["mime_type"],
            )
            session.add(image)
            await session.commit()
            await session.refresh(image)
            
            return str(image.id)