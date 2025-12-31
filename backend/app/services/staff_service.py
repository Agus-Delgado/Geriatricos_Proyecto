from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import UUID
from typing import List, Optional

from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate
from app.services.activity_service import log_event


def create_staff(db: Session, staff_data: StaffCreate, created_by_user_id: UUID) -> Staff:
    """Crear nuevo miembro del personal"""
    staff = Staff(
        **staff_data.model_dump(),
        created_by_user_id=created_by_user_id
    )
    db.add(staff)
    db.flush()
    # Log activity event
    log_event(
        db,
        facility_id=staff.facility_id,
        actor_user_id=created_by_user_id,
        event_type="STAFF_CREATED",
        entity_type="Staff",
        entity_id=staff.id,
        summary=f"Alta de personal: {staff.last_name}, {staff.first_name}",
        event_metadata={"staff_id": str(staff.id), "dni": staff.dni},
    )
    db.commit()
    db.refresh(staff)
    return staff


def get_staff_list(
    db: Session,
    facility_id: UUID,
    active_only: bool = True,
    q: Optional[str] = None
) -> List[Staff]:
    """Listar personal de una facility"""
    query = db.query(Staff).filter(Staff.facility_id == facility_id)
    
    if active_only:
        query = query.filter(Staff.is_active == True)
    
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Staff.first_name.ilike(search_term),
                Staff.last_name.ilike(search_term),
                Staff.dni.ilike(search_term)
            )
        )
    
    return query.order_by(Staff.last_name, Staff.first_name).all()


def get_staff_by_id(db: Session, staff_id: UUID) -> Staff:
    """Obtener personal por ID"""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personal no encontrado"
        )
    return staff


def update_staff(
    db: Session,
    staff_id: UUID,
    staff_data: StaffUpdate,
    actor_user_id: UUID = None
) -> Staff:
    """Actualizar personal"""
    staff = get_staff_by_id(db, staff_id)
    update_data = staff_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)

    # Log activity event
    if actor_user_id:
        if "is_active" in update_data and update_data["is_active"] is False:
            log_event(
                db,
                facility_id=staff.facility_id,
                actor_user_id=actor_user_id,
                event_type="STAFF_ARCHIVED",
                entity_type="Staff",
                entity_id=staff.id,
                summary=f"Baja de personal: {staff.last_name}, {staff.first_name}",
                event_metadata={"changes": update_data},
            )
        else:
            log_event(
                db,
                facility_id=staff.facility_id,
                actor_user_id=actor_user_id,
                event_type="STAFF_UPDATED",
                entity_type="Staff",
                entity_id=staff.id,
                summary=f"Edición de personal: {staff.last_name}, {staff.first_name}",
                event_metadata={"changes": update_data},
            )

    db.commit()
    db.refresh(staff)
    return staff
