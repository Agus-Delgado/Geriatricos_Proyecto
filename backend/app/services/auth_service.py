from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import UUID
from app.models.auth import User, UserRole
from app.models.org import FacilityUserAccess
from app.core.security import verify_password, create_access_token
from datetime import datetime, timedelta
from app.core.config import settings
from fastapi import HTTPException, status


def authenticate_user(db: Session, username: str, password: str) -> User:
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
    
    # Actualizar last_login_at
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    return user


def create_user_token(user: User) -> str:
    """Crear token JWT para usuario"""
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": str(user.id),
        "email": user.email or "",
        "dni": user.dni or "",
    }
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
