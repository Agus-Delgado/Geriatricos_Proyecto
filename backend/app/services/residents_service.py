from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from uuid import UUID
from app.models.residents import Resident
from app.models.audit import AuditLog
from app.schemas.residents import ResidentCreate, ResidentUpdate
from fastapi import HTTPException, status


def create_resident(db: Session, resident_data: ResidentCreate, user_id: UUID) -> Resident:
    """Crear nuevo residente"""
    resident = Resident(
        **resident_data.model_dump(),
        created_by_user_id=user_id,
        updated_by_user_id=user_id
    )
    db.add(resident)
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=user_id,
        action="CREATE_RESIDENT",
        entity_type="Resident",
        entity_id=resident.id,
        metadata_json={"resident_name": f"{resident.first_name} {resident.last_name}"}
    )
    db.add(audit_log)
    db.commit()
    db.refresh(resident)
    
    return resident


def get_residents(
    db: Session,
    facility_id: UUID,
    q: str = None,
    stay_status: str = None
) -> list[Resident]:
    """Listar residentes con filtros"""
    query = db.query(Resident).filter(Resident.facility_id == facility_id)
    
    if stay_status:
        query = query.filter(Resident.stay_status == stay_status)
    
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Resident.first_name.ilike(search_term),
                Resident.last_name.ilike(search_term),
                Resident.dni.ilike(search_term)
            )
        )
    
    return query.order_by(Resident.last_name, Resident.first_name).all()


def get_resident_by_id(db: Session, resident_id: UUID) -> Resident:
    """Obtener residente por ID"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    return resident


def update_resident(
    db: Session,
    resident_id: UUID,
    resident_data: ResidentUpdate,
    user_id: UUID
) -> Resident:
    """Actualizar residente"""
    resident = get_resident_by_id(db, resident_id)
    
    update_data = resident_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resident, field, value)
    
    resident.updated_by_user_id = user_id
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=user_id,
        action="UPDATE_RESIDENT",
        entity_type="Resident",
        entity_id=resident.id,
        metadata_json={"changes": update_data}
    )
    db.add(audit_log)
    db.commit()
    db.refresh(resident)
    
    return resident
