from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from uuid import UUID
from app.models.residents import Resident, ResidentContact
from app.models.audit import AuditLog
from app.services.activity_service import log_event
from app.schemas.residents import ResidentCreate, ResidentUpdate
from fastapi import HTTPException, status


def create_resident(db: Session, resident_data: ResidentCreate, user_id: UUID) -> Resident:
    """Crear nuevo residente con contactos opcionales"""
    # Extraer contactos del payload
    contacts_data = resident_data.contacts or []
    resident_dict = resident_data.model_dump(exclude={'contacts'})
    
    resident = Resident(
        **resident_dict,
        created_by_user_id=user_id,
        updated_by_user_id=user_id
    )
    db.add(resident)
    db.flush()
    
    # Crear contactos si se proporcionaron
    for contact_data in contacts_data:
        # Validar que al menos tenga nombre completo
        if contact_data.full_name and contact_data.full_name.strip():
            contact = ResidentContact(
                resident_id=resident.id,
                full_name=contact_data.full_name.strip(),
                relationship_type=contact_data.relationship_type,
                phone=contact_data.phone,
                email=contact_data.email,
                address=contact_data.address,
                is_primary=contact_data.is_primary
            )
            db.add(contact)
    
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
    # Activity feed
    log_event(
        db,
        facility_id=resident.facility_id,
        actor_user_id=user_id,
        event_type="PATIENT_CREATED",
        entity_type="Resident",
        entity_id=resident.id,
        summary=f"Alta de paciente: {resident.last_name}, {resident.first_name}",
        metadata={"resident_id": str(resident.id), "dni": resident.dni},
    )
    db.commit()
    db.refresh(resident)
    
    return resident


def get_residents(
    db: Session,
    facility_id: UUID,
    q: str = None,
    stay_status: str = None,
    status: str = None,
) -> list[Resident]:
    """Listar residentes con filtros"""
    query = db.query(Resident).filter(Resident.facility_id == facility_id)

    if stay_status:
        query = query.filter(Resident.stay_status == stay_status)
    if status:
        query = query.filter(Resident.status == status)
    
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
    # Activity feed
    if "status" in update_data:
        log_event(
            db,
            facility_id=resident.facility_id,
            actor_user_id=user_id,
            event_type="PATIENT_STATUS_CHANGED",
            entity_type="Resident",
            entity_id=resident.id,
            summary=f"Estado paciente: {update_data['status']}",
            metadata={"changes": {"status": update_data["status"]}},
        )
    else:
        log_event(
            db,
            facility_id=resident.facility_id,
            actor_user_id=user_id,
            event_type="PATIENT_UPDATED",
            entity_type="Resident",
            entity_id=resident.id,
            summary=f"Edición de paciente: {resident.last_name}, {resident.first_name}",
            metadata={"changes": update_data},
        )
    db.commit()
    db.refresh(resident)

    return resident


def delete_resident(db: Session, resident_id: UUID) -> None:
    """Eliminar residente definitivamente (solo OWNER)"""
    resident = get_resident_by_id(db, resident_id)
    db.delete(resident)
    db.commit()
