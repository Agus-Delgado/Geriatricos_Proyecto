from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID
from datetime import date, datetime


class ResidentCreate(BaseModel):
    facility_id: UUID
    first_name: str
    last_name: str
    dni: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[str] = None
    coverage_type: Optional[str] = None
    coverage_number: Optional[str] = None
    admission_date: date
    notes: Optional[str] = None


class ResidentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dni: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[str] = None
    coverage_type: Optional[str] = None
    coverage_number: Optional[str] = None
    admission_date: Optional[date] = None
    stay_status: Optional[str] = Field(None, pattern="^(ACTIVE|ENDED)$")
    end_date: Optional[date] = None
    end_reason: Optional[str] = Field(None, pattern="^(DISCHARGE|PASSING|TRANSFER)$")
    notes: Optional[str] = None
    
    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v, info):
        if v and "admission_date" in info.data and info.data["admission_date"]:
            if v < info.data["admission_date"]:
                raise ValueError("La fecha de finalización no puede ser anterior a la fecha de ingreso")
        return v


class ResidentResponse(BaseModel):
    id: UUID
    facility_id: UUID
    first_name: str
    last_name: str
    dni: Optional[str]
    birth_date: Optional[date]
    sex: Optional[str]
    coverage_type: Optional[str]
    coverage_number: Optional[str]
    admission_date: date
    stay_status: str
    end_date: Optional[date]
    end_reason: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by_user_id: Optional[UUID]
    updated_by_user_id: Optional[UUID]

    class Config:
        from_attributes = True


class ResidentContactCreate(BaseModel):
    full_name: str
    relationship_type: Optional[str] = None  # Renombrado para evitar conflicto
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_primary: bool = False


class ResidentContactUpdate(BaseModel):
    full_name: Optional[str] = None
    relationship_type: Optional[str] = None  # Renombrado para evitar conflicto
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_primary: Optional[bool] = None


class ResidentContactResponse(BaseModel):
    id: UUID
    resident_id: UUID
    full_name: str
    relationship_type: Optional[str]  # Renombrado para evitar conflicto
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    is_primary: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
