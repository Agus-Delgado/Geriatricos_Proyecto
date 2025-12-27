from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, require_facility_access
from app.schemas.certificates import CertificateCreate, CertificateResponse
from app.services.certificate_service import generate_certificate_pdf
from app.models.auth import User
from app.models.residents import Resident
from app.models.certificates import Certificate
from app.models.audit import AuditLog

router = APIRouter(prefix="/residents/{resident_id}/certificates", tags=["certificates"])


@router.post("", response_model=CertificateResponse, status_code=201)
async def create_certificate(
    resident_id: UUID,
    cert_data: CertificateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generar certificado (PDF)"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    # Generar PDF
    resident_name = f"{resident.first_name} {resident.last_name}"
    pdf_buffer, pdf_url = generate_certificate_pdf(
        cert_data.certificate_type,
        resident_name,
        cert_data.content_json,
        cert_data.issued_at
    )
    
    # Guardar certificado en BD
    certificate = Certificate(
        resident_id=resident_id,
        facility_id=resident.facility_id,
        certificate_type=cert_data.certificate_type,
        issued_at=cert_data.issued_at,
        issued_by_user_id=current_user.id,
        content_json=cert_data.content_json,
        pdf_url=pdf_url
    )
    db.add(certificate)
    db.flush()
    
    # Registrar en audit log
    audit_log = AuditLog(
        facility_id=resident.facility_id,
        actor_user_id=current_user.id,
        action="CREATE_CERTIFICATE",
        entity_type="Certificate",
        entity_id=certificate.id,
        metadata_json={
            "certificate_type": cert_data.certificate_type,
            "resident_id": str(resident_id)
        }
    )
    db.add(audit_log)
    db.commit()
    db.refresh(certificate)
    
    return certificate


@router.get("", response_model=List[CertificateResponse])
async def list_certificates(
    resident_id: UUID,
    certificate_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar certificados de un residente"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    query = db.query(Certificate).filter(Certificate.resident_id == resident_id)
    
    if certificate_type:
        query = query.filter(Certificate.certificate_type == certificate_type)
    
    certificates = query.order_by(Certificate.issued_at.desc()).all()
    return certificates


@router.get("/{certificate_id}/pdf")
async def download_certificate_pdf(
    resident_id: UUID,
    certificate_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Descargar PDF del certificado (placeholder - regenerar desde content_json)"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Residente no encontrado"
        )
    
    require_facility_access(resident.facility_id)(current_user, db)
    
    certificate = db.query(Certificate).filter(
        Certificate.id == certificate_id,
        Certificate.resident_id == resident_id
    ).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificado no encontrado"
        )
    
    # Regenerar PDF desde content_json
    resident_name = f"{resident.first_name} {resident.last_name}"
    pdf_buffer, _ = generate_certificate_pdf(
        certificate.certificate_type,
        resident_name,
        certificate.content_json,
        certificate.issued_at
    )
    
    return Response(
        content=pdf_buffer.read(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=certificate_{certificate.certificate_type.lower()}_{certificate.id}.pdf"
        }
    )
