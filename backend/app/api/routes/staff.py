from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access, require_role
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from app.services.staff_service import (
    create_staff,
    get_staff_list,
    get_staff_by_id,
    update_staff,
    transfer_staff,
)
from app.models.auth import User

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("", response_model=StaffResponse, status_code=201)
async def create_staff_endpoint(
    staff_data: StaffCreate,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Crear nuevo miembro del personal (solo OWNER)"""
    require_facility_access(staff_data.facility_id)(current_user, db)
    
    staff = create_staff(db, staff_data, current_user.id)
    return staff


@router.get("", response_model=List[StaffResponse])
async def list_staff(
    facility_id: UUID = Query(..., description="ID de la sede"),
    active_only: bool = Query(True, description="Solo personal activo"),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o DNI"),
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Listar personal (solo OWNER)"""
    require_facility_access(facility_id)(current_user, db)
    
    staff_list = get_staff_list(db, facility_id, active_only, q)
    return staff_list


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: UUID,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Obtener detalle de personal (solo OWNER)"""
    staff = get_staff_by_id(db, staff_id)
    require_facility_access(staff.facility_id)(current_user, db)
    
    return staff


@router.patch("/{staff_id}", response_model=StaffResponse)
async def update_staff_endpoint(
    staff_id: UUID,
    staff_data: StaffUpdate,
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db)
):
    """Actualizar personal (solo OWNER)"""
    staff = get_staff_by_id(db, staff_id)
    require_facility_access(staff.facility_id)(current_user, db)
    
    updated_staff = update_staff(db, staff_id, staff_data, actor_user_id=current_user.id)
    return updated_staff


@router.post("/{staff_id}/transfer", response_model=StaffResponse)
async def transfer_staff_endpoint(
    staff_id: UUID,
    to_facility_id: UUID = Query(..., description="ID de la sede destino"),
    current_user: User = Depends(require_role("OWNER")),
    db: Session = Depends(get_db),
):
    """Trasladar personal a otra sede (solo OWNER)."""
    staff = get_staff_by_id(db, staff_id)
    # Debe tener acceso a sede origen y destino
    require_facility_access(staff.facility_id)(current_user, db)
    require_facility_access(to_facility_id)(current_user, db)

    updated = transfer_staff(db, staff_id, to_facility_id, actor_user_id=current_user.id)
    return updated
