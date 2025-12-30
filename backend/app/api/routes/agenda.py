from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_role_any
from app.schemas.agenda import AgendaEntryCreate, AgendaEntryResponse
from app.services.agenda_service import (
    get_agenda_entries_today,
    create_agenda_entry,
    delete_agenda_entry,
)
from app.models.auth import User
from app.models.residents import Resident
from app.models.agenda import AgendaEntry

router = APIRouter(prefix="/agenda", tags=["agenda"])


@router.get("/today", response_model=List[AgendaEntryResponse])
async def list_agenda_today(
    date_param: Optional[date] = Query(None, alias="date", description="Fecha (YYYY-MM-DD). Default: hoy"),
    current_user: User = Depends(require_facility_role_any(["DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Listar entradas de agenda del día para la facility activa.
    Requiere rol DOCTOR o ADMIN.
    """
    if not current_user.active_facility_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay facility activa"
        )
    
    entries = get_agenda_entries_today(
        db,
        current_user.active_facility_id,
        current_user.id,
        date_param
    )
    
    # Enriquecer con nombres
    result = []
    for entry in entries:
        entry_dict = {
            "id": entry.id,
            "facility_id": entry.facility_id,
            "doctor_user_id": entry.doctor_user_id,
            "patient_id": entry.patient_id,
            "seen_at": entry.seen_at,
            "note": entry.note,
            "created_at": entry.created_at,
            "patient_name": None,
            "doctor_name": current_user.full_name if current_user else None,
        }
        
        # Obtener nombre del paciente
        if entry.patient:
            entry_dict["patient_name"] = f"{entry.patient.last_name}, {entry.patient.first_name}"
        
        result.append(AgendaEntryResponse(**entry_dict))
    
    return result


@router.post("", response_model=AgendaEntryResponse, status_code=201)
async def create_agenda_entry_endpoint(
    data: AgendaEntryCreate,
    current_user: User = Depends(require_facility_role_any(["DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Crear una nueva entrada de agenda.
    Requiere rol DOCTOR o ADMIN.
    """
    if not current_user.active_facility_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay facility activa"
        )
    
    # Asegurar que facility_id coincide con activeFacilityId
    if data.facility_id != current_user.active_facility_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="facility_id no coincide con la facility activa"
        )
    
    try:
        entry = create_agenda_entry(
            db,
            current_user.active_facility_id,
            current_user.id,
            data
        )
        
        # Enriquecer con nombres
        entry_dict = {
            "id": entry.id,
            "facility_id": entry.facility_id,
            "doctor_user_id": entry.doctor_user_id,
            "patient_id": entry.patient_id,
            "seen_at": entry.seen_at,
            "note": entry.note,
            "created_at": entry.created_at,
            "patient_name": None,
            "doctor_name": current_user.full_name,
        }
        
        if entry.patient:
            entry_dict["patient_name"] = f"{entry.patient.last_name}, {entry.patient.first_name}"
        
        return AgendaEntryResponse(**entry_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{entry_id}", status_code=204)
async def delete_agenda_entry_endpoint(
    entry_id: UUID,
    current_user: User = Depends(require_facility_role_any(["DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Eliminar una entrada de agenda.
    Solo permite eliminar entradas propias del mismo facility.
    """
    if not current_user.active_facility_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay facility activa"
        )
    
    success = delete_agenda_entry(
        db,
        entry_id,
        current_user.active_facility_id,
        current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrada de agenda no encontrada o sin permisos"
        )
    
    return None