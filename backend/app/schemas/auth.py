from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Literal
from datetime import datetime, date
from uuid import UUID


class LoginRequest(BaseModel):
    username: str  # DNI o email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleResponse(BaseModel):
    id: UUID
    code: str
    name: str

    class Config:
        from_attributes = True


class FacilityMembershipResponse(BaseModel):
    id: UUID
    facility_id: UUID
    facility_name: str
    facility_code: str
    role: str  # 'ADMIN', 'MEDICO', 'STAFF'
    is_active: bool

    class Config:
        from_attributes = True


class FacilityAccessResponse(BaseModel):
    """Deprecated: usar FacilityMembershipResponse"""
    id: UUID
    facility_id: UUID
    facility_name: str
    facility_code: str
    access_level: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: UUID
    email: Optional[str]
    dni: Optional[str]
    phone: Optional[str]
    full_name: str
    license_number: Optional[str]  # Matrícula médica
    is_active: bool
    is_verified: bool
    is_platform_admin: bool
    active_facility_id: Optional[UUID]
    last_login_at: Optional[datetime]
    roles: List[RoleResponse]
    memberships: List[FacilityMembershipResponse]

    class Config:
        from_attributes = True


class SetActiveFacilityRequest(BaseModel):
    facility_id: UUID


class RegisterRequest(BaseModel):
    role: Literal["doctor", "owner"]
    dni: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    birth_date: date  # YYYY-MM-DD
    phone: Optional[str] = None
    license_number: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v
    
    @field_validator('license_number')
    @classmethod
    def validate_license_number(cls, v: Optional[str], info) -> Optional[str]:
        if info.data.get('role') == 'doctor' and not v:
            raise ValueError('La matrícula es obligatoria para médicos')
        return v


class RegisterResponse(BaseModel):
    message: str


class VerifyEmailRequest(BaseModel):
    token: str


class VerifyEmailResponse(BaseModel):
    message: str


class ResendVerificationRequest(BaseModel):
    email_or_dni: str


class ResendVerificationResponse(BaseModel):
    message: str
