/**
 * Accesos externos del hub médico (/g/:id/medical).
 * Las URLs se definen solo vía variables Vite (VITE_*) en build; no hardcodear dominios aquí.
 */

export interface MedicalLink {
  label: string;
  url: string;
  isValid: boolean;
  envVar: string;
}

/**
 * Valida si una URL es válida (empieza con http:// o https://)
 */
function isValidUrl(url: string): boolean {
  if (!url || url.trim() === '') return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Obtiene la URL de un link desde env vars de Vite.
 */
function getMedicalLinkUrl(envVar: string): { url: string; isValid: boolean } {
  const envValue = import.meta.env[envVar];

  if (envValue && isValidUrl(envValue)) {
    return { url: envValue, isValid: true };
  }

  return { url: '#', isValid: false };
}

export const MEDICAL_LINKS: MedicalLink[] = [
  {
    label: 'MisRX',
    ...getMedicalLinkUrl('VITE_MISRX_URL'),
    envVar: 'VITE_MISRX_URL',
  },
  {
    label: 'Receto',
    ...getMedicalLinkUrl('VITE_RECETO_URL'),
    envVar: 'VITE_RECETO_URL',
  },
  {
    label: 'PAMI',
    ...getMedicalLinkUrl('VITE_PAMI_URL'),
    envVar: 'VITE_PAMI_URL',
  },
];

/** Links con URL válida configurada en el build (para el panel del hub médico). */
export function getConfiguredMedicalLinks(): MedicalLink[] {
  return MEDICAL_LINKS.filter((link) => link.isValid);
}
