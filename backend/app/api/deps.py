from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.models.auth import User, UserRole, UserRoleAssignment
from app.models.org import FacilityUserAccess
from app.core.security import decode_access_token
from app.services.auth_service import get_user_with_relations

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Obtener usuario actual desde JWT token"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user_id_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user_with_relations(db, user_id_uuid)
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    return user


def require_role(role_code: str):
    """Dependency factory para requerir un rol específico"""
    def role_checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        # Obtener roles del usuario
        role_assignments = db.query(UserRoleAssignment).join(UserRole).filter(
            UserRoleAssignment.user_id == current_user.id,
            UserRole.code == role_code
        ).first()
        
        if not role_assignments:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol: {role_code}"
            )
        
        return current_user
    
    return role_checker


def require_facility_access(facility_id: UUID):
    """Dependency factory para validar acceso a una facility"""
    def facility_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        access = db.query(FacilityUserAccess).filter(
            FacilityUserAccess.facility_id == facility_id,
            FacilityUserAccess.user_id == current_user.id
        ).first()
        
        if not access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene acceso a esta sede"
            )
        
        return current_user
    
    return facility_checker


def get_user_facilities(db: Session, user_id: UUID) -> List[FacilityUserAccess]:
    """Obtener todas las facilities accesibles por el usuario"""
    return db.query(FacilityUserAccess).filter(
        FacilityUserAccess.user_id == user_id
    ).all()
