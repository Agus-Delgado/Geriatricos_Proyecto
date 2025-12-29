from fastapi import APIRouter, Depends, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, RoleResponse, FacilityMembershipResponse, SetActiveFacilityRequest
from app.services.auth_service import authenticate_user, create_user_token, get_user_memberships
from app.models.auth import User, UserRoleAssignment, UserRole
from app.models.org import Facility
from uuid import UUID

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login por DNI o email + password (rate limited: 5 intentos por minuto)
    
    Login único sin selección de facility. El frontend debe llamar /auth/me después
    para obtener memberships y active_facility_id.
    """
    user = authenticate_user(
        db, 
        login_data.username, 
        login_data.password
    )
    token = create_user_token(user, db)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener información del usuario actual con roles y memberships"""
    # Obtener roles (globales, legacy)
    role_assignments = db.query(UserRoleAssignment).join(UserRole).filter(
        UserRoleAssignment.user_id == current_user.id
    ).all()
    
    roles = [
        RoleResponse(
            id=ra.role.id,
            code=ra.role.code,
            name=ra.role.name
        )
        for ra in role_assignments
    ]
    
    # Obtener memberships (facility + role)
    memberships_data = get_user_memberships(db, current_user.id)
    
    memberships = []
    for membership in memberships_data:
        facility = db.query(Facility).filter(Facility.id == membership.facility_id).first()
        if facility:
            memberships.append(
                FacilityMembershipResponse(
                    id=membership.id,
                    facility_id=facility.id,
                    facility_name=facility.name,
                    facility_code=facility.code,
                    role=membership.role,
                    is_active=membership.is_active
                )
            )
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        dni=current_user.dni,
        phone=current_user.phone,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        is_platform_admin=current_user.is_platform_admin,
        active_facility_id=current_user.active_facility_id,
        last_login_at=current_user.last_login_at,
        roles=roles,
        memberships=memberships
    )


@router.post("/active-facility")
async def set_active_facility_endpoint(
    request_data: SetActiveFacilityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Establecer facility activa para el usuario actual"""
    from app.services.auth_service import set_active_facility
    
    user = set_active_facility(db, current_user.id, request_data.facility_id)
    return {"active_facility_id": str(user.active_facility_id)}
