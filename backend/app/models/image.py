# app/models/image.py
import uuid
from sqlalchemy import Column, String, DateTime, Integer, BigInteger, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Image(Base):
    __tablename__ = "images"

    # 使用 UUID 类型，as_uuid=False 让 SQLAlchemy 不做转换，直接存字符串
    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    user_id = Column(Integer, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_url = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=True)
    mime_type = Column(String(100), nullable=True)
    type = Column(String(50), default="raw")
    parent_id = Column(UUID(as_uuid=False), nullable=True)
    status = Column(String(20), default="uploaded")
    error_message = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_images_task_id", "task_id"),
        Index("idx_images_type", "type"),
        Index("idx_images_parent_id", "parent_id"),
    )