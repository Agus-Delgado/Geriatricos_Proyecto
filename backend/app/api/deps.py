from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from uuid import UUID
from app.db.session import get_db
from app.models.auth import User, UserRole, UserRoleAssignment
from app.models.org import FacilityUserAccess, Facility
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
    """Dependency factory para validar acceso a una facility (legacy, usar require_facility_role)"""
    def facility_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        # Platform admin tiene acceso a todas las facilities
        if current_user.is_platform_admin:
            return current_user
        
        access = db.query(FacilityUserAccess).filter(
            FacilityUserAccess.facility_id == facility_id,
            FacilityUserAccess.user_id == current_user.id,
            FacilityUserAccess.is_active == True
        ).first()
        
        if not access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene acceso a esta sede"
            )
        
        return current_user
    
    return facility_checker


def require_platform_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency para requerir que el usuario sea platform admin"""
    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador de plataforma"
        )
    return current_user


def get_current_facility_context(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Tuple[User, Optional[UUID], Optional[str]]:
    """
    Dependency que retorna (user, active_facility_id, active_role)
    Si es platform_admin, puede no tener facility activa (retorna None, None)
    """
    if current_user.is_platform_admin or not current_user.active_facility_id:
        return (current_user, None, None)
    
    # Obtener membership activa para la facility activa
    membership = db.query(FacilityUserAccess).filter(
        FacilityUserAccess.user_id == current_user.id,
        FacilityUserAccess.facility_id == current_user.active_facility_id,
        FacilityUserAccess.is_active == True
    ).first()
    
    if not membership:
        return (current_user, None, None)
    
    return (current_user, current_user.active_facility_id, membership.role)


def require_facility_role(role: str):
    """
    Dependency factory para requerir un rol específico en la facility activa.
    role: 'ADMIN', 'MEDICO', o 'STAFF'
    Platform admin siempre tiene acceso.
    """
    def role_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        # Platform admin siempre tiene acceso
        if current_user.is_platform_admin:
            return current_user
        
        if not current_user.active_facility_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No hay facility activa"
            )
        
        # Obtener membership activa
        membership = db.query(FacilityUserAccess).filter(
            FacilityUserAccess.user_id == current_user.id,
            FacilityUserAccess.facility_id == current_user.active_facility_id,
            FacilityUserAccess.is_active == True,
            FacilityUserAccess.role == role
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol '{role}' en esta facility"
            )
        
        return current_user
    
    return role_checker


def get_user_facilities(db: Session, user_id: UUID) -> List[FacilityUserAccess]:
    """Obtener todas las facilities accesibles por el usuario (legacy, usar get_user_memberships)"""
    return db.query(FacilityUserAccess).filter(
        FacilityUserAccess.user_id == user_id,
        FacilityUserAccess.is_active == True
    ).all()
