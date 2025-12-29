from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
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
