from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.image_service import ImageService

router = APIRouter(prefix="/images", tags=["图片管理"])


class UploadResponse(BaseModel):
    image_id: str
    file_name: str
    file_url: str
    file_size: int
    message: str


@router.post("/upload", response_model=UploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    user_id: int = Form(...),
    telescope_id: Optional[str] = Form(None),
):
    """
    上传单张图片
    - 图片保存到服务器磁盘
    - 元数据存入数据库
    - 返回图片唯一 ID
    """
    # 1. 保存文件到磁盘
    file_info = await ImageService.save_upload_file(file)
    
    # 2. 保存记录到数据库
    image_id = await ImageService.create_image_record(
        user_id=user_id,
        file_info=file_info,
        telescope_id=telescope_id
    )
    
    return UploadResponse(
        image_id=image_id,
        file_name=file_info["file_name"],
        file_url=file_info["file_url"],
        file_size=file_info["file_size"],
        message="上传成功"
    )