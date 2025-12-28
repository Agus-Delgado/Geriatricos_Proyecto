from sqlalchemy.orm import Session
from sqlalchemy import or_, case
from uuid import UUID
from app.models.auth import User, UserRole, UserRoleAssignment
from app.models.org import FacilityUserAccess, Facility
from app.core.security import verify_password, create_access_token
from datetime import datetime, timedelta
from app.core.config import settings
from fastapi import HTTPException, status


def authenticate_user(db: Session, username: str, password: str, facility_slug: str | None = None) -> tuple[User, Facility | None]:
    """Autenticar usuario por DNI o email"""
    # Buscar por DNI o email
    user = db.query(User).filter(
        or_(
            User.dni == username,
            User.email == username
        )
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    # Si se proporciona facility_slug, validar acceso
    facility = None
    if facility_slug:
        facility = db.query(Facility).filter(Facility.slug == facility_slug).first()
        if not facility:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Geriátrico no encontrado"
            )
        
        # Verificar que el usuario tenga acceso a esta facility
        access = db.query(FacilityUserAccess).filter(
            FacilityUserAccess.facility_id == facility.id,
            FacilityUserAccess.user_id == user.id
        ).first()
        
        if not access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene acceso a este geriátrico"
            )
    
    # Actualizar last_login_at
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    return user, facility


def create_user_token(user: User, facility_id: UUID | None = None, db: Session | None = None) -> str:
    """Crear token JWT para usuario con facility_id y role"""
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": str(user.id),
        "email": user.email or "",
        "dni": user.dni or "",
    }
    
    # Incluir facility_id en el token si se proporciona
    if facility_id:
        token_data["facility_id"] = str(facility_id)
    
    # Incluir role principal del usuario (OWNER tiene prioridad sobre DOCTOR)
    if db:
        role_assignments = db.query(UserRoleAssignment).join(UserRole).filter(
            UserRoleAssignment.user_id == user.id
        ).order_by(
            # OWNER primero, luego DOCTOR
            sa.case(
                (UserRole.code == "OWNER", 1),
                (UserRole.code == "DOCTOR", 2),
                else_=3
            )
        ).all()
        
        if role_assignments:
            # Determinar rol principal: OWNER tiene prioridad
            roles = [ra.role.code for ra in role_assignments]
            if "OWNER" in roles:
                token_data["role"] = "OWNER"
            elif "DOCTOR" in roles:
                token_data["role"] = "DOCTOR"
            else:
                token_data["role"] = roles[0] if roles else None
    
    return create_access_token(data=token_data, expires_delta=expires_delta)


def get_user_with_relations(db: Session, user_id: UUID) -> User:
    """Obtener usuario con roles y facilities cargados"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return user
