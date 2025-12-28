from sqlalchemy import Column, String, Date, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base


class Staff(Base):
    __tablename__ = "staff"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    dni = Column(String(16), nullable=True)
    phone = Column(String(32), nullable=True)
    email = Column(String(255), nullable=True)
    position = Column(String(80), nullable=True)  # Cuidador, Enfermero, etc.
    hire_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    facility = relationship("Facility", back_populates="staff")
    attendances = relationship("Attendance", back_populates="staff", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("ix_staff_facility_id", "facility_id"),
        Index("ix_staff_active", "facility_id", "is_active"),
        Index("ix_staff_name", "last_name", "first_name"),
    )
