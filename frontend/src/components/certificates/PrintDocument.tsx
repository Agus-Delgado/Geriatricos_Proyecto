import { useEffect, useMemo } from 'react';
import type { CertificateDraft } from '../../types/certificates';
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

  const footerLeft = `${draft.hogarName}, ${draft.hogarAddress}, Ramos Mejía`;
  const license = draft.doctorLicenseNumber?.trim() ? draft.doctorLicenseNumber.trim() : '(pendiente de configurar)';
  const footerRight = `${draft.doctorDisplayName} — Matrícula: ${license}`;

  return (
    <div className="print-root">
      {/* Título neutro opcional. Si querés máxima seguridad, dejalo vacío. */}
      <div className="print-title">Constancia</div>

      <div className="print-body">
        {draft.bodyText.split('\n').map((line, idx) => (
          <p key={idx} className="print-paragraph">
            {line}
          </p>
        ))}
      </div>

      <div className="print-footer">
        <div className="print-footer-left">{footerLeft}</div>
        <div className="print-footer-right">
          <div className="print-signature-line">Firma:</div>
          <div className="print-doctor">{footerRight}</div>
        </div>
      </div>
    </div>
  );
}
