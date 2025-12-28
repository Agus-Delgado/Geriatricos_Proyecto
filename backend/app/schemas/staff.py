from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from typing import Optional


class StaffCreate(BaseModel):
    facility_id: UUID
    first_name: str
    last_name: str
    dni: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    notes: Optional[str] = None


class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dni: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class StaffResponse(BaseModel):
    id: UUID
    facility_id: UUID
    first_name: str
    last_name: str
    dni: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    position: Optional[str]
    hire_date: Optional[date]
    is_active: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
