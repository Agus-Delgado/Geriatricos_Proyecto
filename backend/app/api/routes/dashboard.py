from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_facility_context
from app.schemas.dashboard import DayStatsResponse
from app.services.dashboard_service import get_day_summary
from app.models.auth import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DayStatsResponse)
async def get_dashboard_summary(
    date_param: date = Query(..., alias="date", description="Fecha (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener resumen del día para la facility activa"""
    user, active_facility_id, _ = get_current_facility_context(current_user, db)

    if not active_facility_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay facility activa"
        )

    summary = get_day_summary(db, active_facility_id, date_param)

    return DayStatsResponse(**summary)