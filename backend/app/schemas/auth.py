from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class LoginRequest(BaseModel):
    username: str  # DNI o email
    password: str
    facility_slug: str | None = None  # Slug del geriátrico (opcional por compatibilidad)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleResponse(BaseModel):
    id: UUID
    code: str
    name: str

    class Config:
        from_attributes = True


class FacilityAccessResponse(BaseModel):
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
    is_active: bool
    is_verified: bool
    last_login_at: Optional[datetime]
    roles: List[RoleResponse]
    facilities: List[FacilityAccessResponse]

    class Config:
        from_attributes = True
