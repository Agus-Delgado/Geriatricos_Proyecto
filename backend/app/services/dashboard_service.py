from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from uuid import UUID
from datetime import datetime, date, time
from app.models.prescriptions import PrescriptionLog
from app.models.clinical import ClinicalNote


def get_day_summary(
    db: Session,
    facility_id: UUID,
    target_date: date
) -> dict:
    """Obtener resumen del día para una facility"""
    # Convertir date a datetime para comparaciones
    start_datetime = datetime.combine(target_date, time.min)
    end_datetime = datetime.combine(target_date, time.max)

    # Contar recetas creadas hoy
    prescriptions_count = db.query(func.count(PrescriptionLog.id)).filter(
        PrescriptionLog.facility_id == facility_id,
        PrescriptionLog.created_at >= start_datetime,
        PrescriptionLog.created_at <= end_datetime
    ).scalar() or 0

    # Contar notas clínicas creadas hoy
    clinical_notes_count = db.query(func.count(ClinicalNote.id)).filter(
        ClinicalNote.facility_id == facility_id,
        ClinicalNote.created_at >= start_datetime,
        ClinicalNote.created_at <= end_datetime
    ).scalar() or 0

    # Para pacientes vistos, por ahora retornamos None (no hay tracking backend)
    # Se puede implementar con una tabla PatientViewLog en el futuro
    patients_viewed_count = None

    return {
        "facilityId": str(facility_id),
        "date": target_date.isoformat(),
        "prescriptions_created_today": prescriptions_count,
        "clinical_notes_created_today": clinical_notes_count,
        "patients_viewed_today": patients_viewed_count,
    }