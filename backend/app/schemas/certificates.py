from pydantic import BaseModel
from typing import Dict, Any
from uuid import UUID
from datetime import datetime


class CertificateCreate(BaseModel):
    certificate_type: str  # SURVIVAL / DOMICILE / DEATH
    content_json: Dict[str, Any]  # Campos variables del certificado
    issued_at: datetime


class CertificateResponse(BaseModel):
    id: UUID
    resident_id: UUID
    facility_id: UUID
    certificate_type: str
    issued_at: datetime
    issued_by_user_id: UUID
    content_json: Dict[str, Any]
    pdf_url: str
    created_at: datetime

    class Config:
        from_attributes = True
