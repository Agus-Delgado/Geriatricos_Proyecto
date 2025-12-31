from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access, require_facility_role_any
from app.schemas.residents import ResidentCreate, ResidentUpdate, ResidentResponse
from app.services.residents_service import (
    create_resident,
    get_residents,
    get_resident_by_id,
    update_resident,
    delete_resident,
)
from app.models.auth import User

router = APIRouter(prefix="/residents", tags=["residents"])


@router.post("", response_model=ResidentResponse, status_code=201)
async def create_resident_endpoint(
    resident_data: ResidentCreate,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Crear nuevo residente (requiere rol MEDICO o ADMIN en la facility activa)"""
    # Validar acceso a la facility
    require_facility_access(resident_data.facility_id)(current_user, db)
    
    resident = create_resident(db, resident_data, current_user.id)
    return resident


@router.get("", response_model=List[ResidentResponse])
async def list_residents(
    facility_id: UUID = Query(..., description="ID de la sede"),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o DNI"),
    stay_status: Optional[str] = Query(None, description="Filtrar por estadía: ACTIVE o ENDED"),
    status: Optional[str] = Query(None, description="Filtrar por status del paciente: ACTIVE, INACTIVE, DECEASED"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar residentes con búsqueda y filtros"""
    # Validar acceso a la facility
    require_facility_access(facility_id)(current_user, db)
    
    residents = get_residents(db, facility_id, q, stay_status, status)
    return residents


@router.get("/{resident_id}", response_model=ResidentResponse)
async def get_resident(
    resident_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un residente"""
    resident = get_resident_by_id(db, resident_id)
    
    # Validar acceso a la facility del residente
    require_facility_access(resident.facility_id)(current_user, db)
    
    return resident


@router.patch("/{resident_id}", response_model=ResidentResponse)
async def update_resident_endpoint(
    resident_id: UUID,
    resident_data: ResidentUpdate,
    current_user: User = Depends(require_facility_role_any(['MEDICO', 'ADMIN'])),
    db: Session = Depends(get_db)
):
    """Actualizar residente (requiere rol MEDICO o ADMIN en la facility activa)"""
    resident = get_resident_by_id(db, resident_id)
    
    # Validar acceso a la facility del residente
    require_facility_access(resident.facility_id)(current_user, db)
    
    updated_resident = update_resident(db, resident_id, resident_data, current_user.id)
    return updated_resident


@router.delete("/{resident_id}", status_code=204)
async def delete_resident_endpoint(
    resident_id: UUID,
    current_user: User = Depends(require_role('OWNER')),
    db: Session = Depends(get_db)
):
    """Eliminar residente definitivamente (solo OWNER)"""
    # Nota: Validar acceso a la facility del residente
    resident = get_resident_by_id(db, resident_id)
    require_facility_access(resident.facility_id)(current_user, db)
    delete_resident(db, resident_id)
    return
