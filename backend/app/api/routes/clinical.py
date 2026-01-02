from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access
from app.schemas.clinical import (
    ClinicalSummaryUpdate,
    ClinicalSummaryResponse,
    ClinicalNoteCreate,
    ClinicalNoteResponse,
    VitalSignCreate,
    VitalSignResponse
)
from app.models.auth import User
from app.models.residents import Resident
from app.models.clinical import ClinicalSummary, ClinicalNote, VitalSign
from app.models.audit import AuditLog

router = APIRouter(prefix="/residents/{resident_id}", tags=["clinical"])


# Clinical Summary
@router.get("/clinical-summary", response_model=ClinicalSummaryResponse)
async def get_clinical_summary(
    resident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener resumen clínico del residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    summary = db.query(ClinicalSummary).filter(
        ClinicalSummary.resident_id == resident_id
    ).first()
    
    if not summary:
        # Crear resumen vacío si no existe
        summary = ClinicalSummary(
            resident_id=resident_id,
            updated_by_user_id=current_user.id
        )
        db.add(summary)
        db.commit()
        db.refresh(summary)
    
    return summary


@router.put("/clinical-summary", response_model=ClinicalSummaryResponse)
async def update_clinical_summary(
    resident_id: UUID,
    summary_data: ClinicalSummaryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar resumen clínico"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    summary = db.query(ClinicalSummary).filter(
        ClinicalSummary.resident_id == resident_id
    ).first()
    
    if not summary:
        summary = ClinicalSummary(
            resident_id=resident_id,
            **summary_data.model_dump(),
            updated_by_user_id=current_user.id
        )
        db.add(summary)
    else:
        update_data = summary_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(summary, field, value)
        summary.updated_by_user_id = current_user.id
    
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=current_user.id,
        action="UPDATE_CLINICAL_SUMMARY",
        entity_type="ClinicalSummary",
        entity_id=summary.id,
        metadata_json={"resident_id": str(resident_id)}
    )
    db.add(audit_log)
    db.commit()
    db.refresh(summary)
    
    return summary


# Clinical Notes
@router.get("/clinical-notes", response_model=List[ClinicalNoteResponse])
async def list_clinical_notes(
    resident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar notas clínicas (evoluciones) del residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    notes = db.query(ClinicalNote).filter(
        ClinicalNote.resident_id == resident_id
    ).order_by(ClinicalNote.recorded_at.desc()).all()
    
    return notes


@router.post("/clinical-notes", response_model=ClinicalNoteResponse, status_code=201)
async def create_clinical_note(
    resident_id: UUID,
    note_data: ClinicalNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nota clínica (evolución/incidente)"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    note = ClinicalNote(
        resident_id=resident_id,
        facility_id=resident.facility_id,
        author_user_id=current_user.id,
        recorded_at=note_data.recorded_at or datetime.utcnow(),
        **note_data.model_dump(exclude={"recorded_at"})
    )
    db.add(note)
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=current_user.id,
        action="CREATE_CLINICAL_NOTE",
        entity_type="ClinicalNote",
        entity_id=note.id,
        metadata_json={"resident_id": str(resident_id), "note_type": note_data.note_type}
    )
    db.add(audit_log)
    db.commit()
    db.refresh(note)
    
    return note


# Vital Signs
@router.get("/vital-signs", response_model=List[VitalSignResponse])
async def list_vital_signs(
    resident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar signos vitales del residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    vital_signs = db.query(VitalSign).filter(
        VitalSign.resident_id == resident_id
    ).order_by(VitalSign.recorded_at.desc()).all()
    
    return vital_signs


@router.post("/vital-signs", response_model=VitalSignResponse, status_code=201)
async def create_vital_sign(
    resident_id: UUID,
    vital_data: VitalSignCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registrar signos vitales"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    vital_sign = VitalSign(
        resident_id=resident_id,
        recorded_by_user_id=current_user.id,
        **vital_data.model_dump()
    )
    db.add(vital_sign)
    db.commit()
    db.refresh(vital_sign)
    
    return vital_sign
