from fastapi import APIRouter, Depends, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, get_user_facilities
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, RoleResponse, FacilityAccessResponse
from app.services.auth_service import authenticate_user, create_user_token
from app.models.auth import User, UserRoleAssignment, UserRole
from app.models.org import Facility

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login por DNI o email + password (rate limited: 5 intentos por minuto)"""
    user = authenticate_user(db, login_data.username, login_data.password)
    token = create_user_token(user)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener información del usuario actual con roles y facilities"""
    # Obtener roles
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
    
    # Obtener facilities accesibles
    facility_accesses = get_user_facilities(db, current_user.id)
    
    facilities = []
    for access in facility_accesses:
        facility = db.query(Facility).filter(Facility.id == access.facility_id).first()
        if facility:
            facilities.append(
                FacilityAccessResponse(
                    id=access.id,
                    facility_id=facility.id,
                    facility_name=facility.name,
                    facility_code=facility.code,
                    access_level=access.access_level
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
        last_login_at=current_user.last_login_at,
        roles=roles,
        facilities=facilities
    )
