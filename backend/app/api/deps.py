from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from uuid import UUID
import logging
from app.db.session import get_db
from app.models.auth import User, UserRole, UserRoleAssignment
from app.models.org import FacilityUserAccess, Facility
from app.core.security import decode_access_token
from app.services.auth_service import get_user_with_relations

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)  # auto_error=False para manejar manualmente


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Obtener usuario actual desde JWT token. Devuelve 401 si no hay token o es inválido (nunca 500)"""
    # Si no hay credentials, verificar si hay token en el header manualmente
    if not credentials:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = auth_header.replace("Bearer ", "").strip()
    else:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Decodificar token - capturar cualquier excepción para evitar 500
    try:
        payload = decode_access_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        # Re-raise HTTPException (ya es 401)
        raise
    except Exception as e:
        # Cualquier otra excepción inesperada -> 401 (no 500)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error al validar token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Detectar impersonación
    is_impersonation = payload.get("is_impersonation", False)
    actor_admin_id = None
    
    if is_impersonation:
        # En caso de impersonación, el user_id en "sub" es el usuario impersonado
        # Guardar actor_admin_id en el contexto del request para auditoría
        actor_admin_id_str = payload.get("actor_admin_id")
        if actor_admin_id_str:
            try:
                actor_admin_id = UUID(actor_admin_id_str)
                # Guardar en request.state para acceso posterior
                request.state.actor_admin_id = actor_admin_id
                request.state.is_impersonation = True
            except (ValueError, TypeError):
                pass  # Si no se puede parsear, continuar sin auditoría
    
    # Extraer user_id del payload (puede ser el usuario impersonado si hay impersonación)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Validar que user_id sea un UUID válido
    try:
        user_id_uuid = UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Obtener usuario de la base de datos - capturar todas las excepciones para evitar 500
    try:
        user = get_user_with_relations(db, user_id_uuid)
    except HTTPException:
        # Re-raise HTTPException (ya es 401/403)
        raise
    except Exception as e:
        # Cualquier error de DB o inesperado -> 401 (no 500)
        logger.warning(f"Error al obtener usuario en get_current_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error al obtener usuario",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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


def require_facility_role_any(allowed_roles: List[str]):
    """
    Dependency factory para requerir que el usuario tenga uno de los roles especificados
    en la facility activa.
    allowed_roles: Lista de roles permitidos, ej: ['MEDICO', 'ADMIN']
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
            FacilityUserAccess.role.in_(allowed_roles)
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere uno de los roles: {', '.join(allowed_roles)}"
            )
        
        return current_user
    
    return role_checker


def get_user_facilities(db: Session, user_id: UUID) -> List[FacilityUserAccess]:
    """Obtener todas las facilities accesibles por el usuario (legacy, usar get_user_memberships)"""
    return db.query(FacilityUserAccess).filter(
        FacilityUserAccess.user_id == user_id,
        FacilityUserAccess.is_active == True
    ).all()


def get_impersonation_context(request: Request) -> Optional[dict]:
    """Obtener información de impersonación del request si existe"""
    if hasattr(request.state, "is_impersonation") and request.state.is_impersonation:
        return {
            "is_impersonation": True,
            "actor_admin_id": getattr(request.state, "actor_admin_id", None)
        }
    return None
