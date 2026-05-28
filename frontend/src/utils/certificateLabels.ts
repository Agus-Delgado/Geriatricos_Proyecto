import type { CertificateType } from '../types/certificates';

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  CONTROL_CLINICO: 'Control clínico',
  OBITO: 'Óbito',
  PRESENCIA: 'Constancia de supervivencia',
  CONSENTIMIENTO: 'Consentimiento informado',
};

export function getCertificateTypeLabel(type: string): string {
  return CERTIFICATE_TYPE_LABELS[type as CertificateType] ?? type;
}
