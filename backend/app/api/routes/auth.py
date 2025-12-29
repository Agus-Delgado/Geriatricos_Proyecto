from fastapi import APIRouter, Depends, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserResponse, RoleResponse, FacilityMembershipResponse, 
    SetActiveFacilityRequest, RegisterRequest, RegisterResponse, VerifyEmailRequest, 
    VerifyEmailResponse, ResendVerificationRequest, ResendVerificationResponse
)
from app.services.auth_service import authenticate_user, create_user_token, get_user_memberships
from app.models.auth import User, UserRoleAssignment, UserRole, EmailVerificationToken
from app.models.org import Facility
from app.core.security import get_password_hash
from app.core.config import settings
from app.services.email_service import send_email, render_verification_email
from app.services.email_verification_service import (
    create_verification_token, verify_token, mark_consumed, 
    can_resend, increment_send_count
)
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

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
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener información del usuario actual con roles y memberships.
    
    Devuelve 401 si no hay token o es inválido (nunca 500).
    """
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


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Registrar nuevo usuario. Se envía email de verificación."""
    # Validar DNI único
    existing_user_dni = db.query(User).filter(User.dni == register_data.dni).first()
    if existing_user_dni:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con este DNI"
        )
    
    # Validar email único
    existing_user_email = db.query(User).filter(User.email == register_data.email).first()
    if existing_user_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con este email"
        )
    
    # Validar license_number para médicos (ya validado en schema, pero por si acaso)
    if register_data.role == "doctor" and not register_data.license_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La matrícula es obligatoria para médicos"
        )
    
    # Crear usuario
    full_name = f"{register_data.first_name} {register_data.last_name}"
    password_hash = get_password_hash(register_data.password)
    
    user = User(
        dni=register_data.dni,
        email=register_data.email,
        phone=register_data.phone,
        full_name=full_name,
        birth_date=register_data.birth_date,
        license_number=register_data.license_number,
        password_hash=password_hash,
        is_active=True,
        is_verified=False,  # Requiere verificación
        is_platform_admin=(register_data.role == "owner")
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"Usuario registrado: {user.id} ({full_name}, {register_data.email})")
    
    # Generar token de verificación
    token = create_verification_token(db, user.id)
    
    # Construir URL de verificación
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    # Generar plantilla de email
    text_body, html_body = render_verification_email(verify_url)
    
    # Enviar email
    try:
        send_email(
            to=register_data.email,
            subject="Verificá tu email",
            text_body=text_body,
            html_body=html_body
        )
        logger.info(f"Email de verificación enviado a {register_data.email}")
    except Exception as e:
        logger.error(f"Error al enviar email de verificación a {register_data.email}: {str(e)}")
        # No fallar el registro si falla el email (el usuario puede solicitar reenvío)
    
    return RegisterResponse(message="Usuario registrado. Revisá tu email para verificar tu cuenta.")


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    request: Request,
    verify_data: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """Verificar email usando token"""
    token_record = verify_token(db, verify_data.token)
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enlace inválido o expirado"
        )
    
    # Marcar usuario como verificado
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    user.is_verified = True
    mark_consumed(db, token_record)
    db.commit()  # Asegurar que los cambios se persistan
    
    logger.info(f"Email verificado para usuario {user.id} ({user.email})")
    
    return VerifyEmailResponse(message="Email verificado. Ya podés ingresar.")


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(
    request: Request,
    resend_data: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """Reenviar email de verificación"""
    # Normalizar identificador
    identifier = (resend_data.email_or_dni or "").strip()
    
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email o DNI requerido"
        )
    
    # Buscar usuario por DNI o email
    user = db.query(User).filter(
        or_(
            User.dni == identifier,
            User.email == identifier
        )
    ).first()
    
    if not user:
        # Por seguridad, no revelar si el usuario existe o no
        return ResendVerificationResponse(
            message="Si el email existe y no está verificado, se enviará un nuevo enlace."
        )
    
    # Si ya está verificado
    if user.is_verified:
        return ResendVerificationResponse(
            message="Tu email ya está verificado. Podés iniciar sesión."
        )
    
    # Verificar rate limit
    can_send, error_message = can_resend(db, user.id)
    if not can_send:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_message
        )
    
    # Generar token (siempre crea uno nuevo, el servicio maneja la lógica)
    token = create_verification_token(db, user.id)
    
    # Obtener el registro del token recién creado para incrementar contador
    from datetime import datetime
    now = datetime.utcnow()
    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id
    ).order_by(EmailVerificationToken.created_at.desc()).first()
    
    if token_record:
        increment_send_count(db, token_record)
    
    # Construir URL de verificación
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    # Generar plantilla de email
    text_body, html_body = render_verification_email(verify_url)
    
    # Enviar email
    try:
        send_email(
            to=user.email,
            subject="Verificá tu email",
            text_body=text_body,
            html_body=html_body
        )
        logger.info(f"Email de verificación reenviado a {user.email}")
    except Exception as e:
        logger.error(f"Error al reenviar email de verificación a {user.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al enviar email. Intentá nuevamente más tarde."
        )
    
    return ResendVerificationResponse(
        message="Email de verificación enviado. Revisá tu bandeja de entrada (y Spam/Promociones)."
    )
