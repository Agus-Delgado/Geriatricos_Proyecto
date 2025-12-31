from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access, require_facility_role_any, require_role
from app.schemas.activity import ActivityEventResponse
from app.services.activity_service import list_events
from app.models.auth import User


router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=List[ActivityEventResponse])
async def get_activity(
    facility_id: UUID = Query(..., description="ID de la sede"),
    since: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    event_types: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtener eventos de actividad recientes.

    Permisos:
    - OWNER ve todos los eventos de la sede.
    - MEDICO/ADMIN ven eventos clínicos y de pacientes.
    - STAFF no accede.
    """
    # Validar acceso básico a la facility
    require_facility_access(facility_id)(current_user, db)

    # Filtro por rol
    # Si es OWNER o platform admin: ver todo
    is_owner = any(r.code == "OWNER" for r in current_user.roles)
    if not (is_owner or current_user.is_platform_admin):
        # Requerir rol MEDICO o ADMIN para ver feed clínico
        require_facility_role_any(["MEDICO", "ADMIN"])(current_user, db)
        # Limitar event_types si no se enviaron: solo clínicos/pacientes
        if not event_types:
            event_types = [
                "PATIENT_CREATED",
                "PATIENT_UPDATED",
                "PATIENT_STATUS_CHANGED",
                "MEDICATION_CHANGED",
            ]

    events = list_events(
        db,
        facility_id=facility_id,
        since=since,
        limit=limit,
        event_types=event_types,
    )
    return events

