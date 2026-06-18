import uuid
from sqlalchemy import Column, String, DateTime, Integer, BigInteger, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Image(Base):
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, nullable=False)
    telescope_id = Column(String(50), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_url = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=True)
    mime_type = Column(String(100), nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_images_user_id", "user_id"),
        Index("idx_images_uploaded_at", "uploaded_at"),
    )
