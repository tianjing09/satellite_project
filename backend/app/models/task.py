import uuid
from sqlalchemy import Column, String, DateTime, Integer, Text, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)
    telescope_id = Column(String(50), nullable=True)
    task_dir = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    progress = Column(Integer, default=0)
    total_images = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    __table_args__ = (
        Index("idx_tasks_user_id", "user_id"),
        Index("idx_tasks_status", "status"),
        Index("idx_tasks_created", "created_at"),
    )