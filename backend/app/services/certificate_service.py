from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO
import uuid
from datetime import datetime
from typing import Dict, Any
from app.core.config import settings


def generate_certificate_pdf(
    certificate_type: str,
    resident_name: str,
    content_json: Dict[str, Any],
    issued_at: datetime
) -> tuple[BytesIO, str]:
    """Generar PDF del certificado y retornar buffer + URL placeholder"""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Título según tipo
    type_titles = {
        "SURVIVAL": "CERTIFICADO DE SUPERVIVENCIA",
        "DOMICILE": "CERTIFICADO DE DOMICILIO",
        "DEATH": "CERTIFICADO DE ÓBITO"
    }
    title = type_titles.get(certificate_type, "CERTIFICADO")
    
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 0.3 * inch))
    
    # Contenido del certificado
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=12,
        leading=16,
        alignment=TA_LEFT
    )
    
    # Información del residente
    story.append(Paragraph(f"<b>Residente:</b> {resident_name}", body_style))
    story.append(Spacer(1, 0.2 * inch))
    
    # Campos variables desde content_json
    for key, value in content_json.items():
        if value:
            story.append(Paragraph(f"<b>{key.replace('_', ' ').title()}:</b> {value}", body_style))
            story.append(Spacer(1, 0.1 * inch))
    
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(f"<b>Fecha de emisión:</b> {issued_at.strftime('%d/%m/%Y %H:%M')}", body_style))
    
    # Construir PDF
    doc.build(story)
    buffer.seek(0)
    
    # Generar URL placeholder (en producción sería S3/R2/Cloudinary)
    pdf_filename = f"certificate_{certificate_type.lower()}_{uuid.uuid4().hex[:8]}.pdf"
    pdf_url = f"{settings.STORAGE_BASE_URL}/{pdf_filename}"
    
    return buffer, pdf_url
