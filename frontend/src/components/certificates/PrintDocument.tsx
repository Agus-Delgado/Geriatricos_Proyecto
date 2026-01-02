import { useEffect, useMemo } from 'react';
import type { CertificateDraft } from '../../types/certificates';
import { RxPaperFrame } from './RxPaperFrame';
import './print.css';

// IMPORTANTE: este componente NO debe incluir navbar ni sidebar.
// Debe renderizar SOLO el documento imprimible.
export function PrintDocument({ draft }: { draft: CertificateDraft }) {
  // Guardrail: prohibido "certificado" en el HTML de impresión
  const forbidden = useMemo(() => {
    const html = `${draft.bodyText} ${draft.hogarName} ${draft.hogarAddress} ${draft.doctorDisplayName}`.toLowerCase();
    return html.includes('certificado');
  }, [draft]);

  useEffect(() => {
    if (forbidden) {
      // Evitar imprimir si el texto contiene "certificado"
      // (No rompe la app, pero protege el requisito.)
      // Podés mostrar un mensaje y bloquear el print.
      // eslint-disable-next-line no-alert
      alert('Error: el documento contiene la palabra prohibida "certificado". Ajuste el texto antes de imprimir.');
    }
  }, [forbidden]);

  const license = draft.doctorLicenseNumber?.trim() ? draft.doctorLicenseNumber.trim() : '(pendiente de configurar)';
  const facilityAddress = `${draft.hogarName}, ${draft.hogarAddress}, Ramos Mejía`;

  return (
    <RxPaperFrame 
      headerDate={draft.issuedAt}
      patientName={draft.patientFullName}
      patientAddress={draft.patientDni ? `DNI: ${draft.patientDni}` : ''}
    >
      <div className="print-root">
        {/* Título centrado */}
        <div className="print-title">CONSTANCIA</div>

        {/* Cuerpo del documento */}
        <div className="print-body">
          {draft.bodyText.split('\n').map((line, idx) => (
            <p key={idx} className="print-paragraph">
              {line}
            </p>
          ))}
        </div>

        {/* Footer: Firma + Matrícula + Dirección (todo abajo derecha) */}
        <div className="print-footer-right">
          <div className="print-signature-section">
            <div className="print-signature-label">Firma:</div>
            <div className="print-signature-line"></div>
            <div className="print-doctor-name">Dr/a. {draft.doctorDisplayName}</div>
            <div className="print-doctor-license">Matrícula: {license}</div>
          </div>
          <div className="print-facility-address">
            {facilityAddress}
          </div>
        </div>
      </div>
    </RxPaperFrame>
  );
}
