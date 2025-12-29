/**
 * Configuración de links externos para recetas médicas
 * Los valores pueden venir de variables de entorno con fallback a placeholders
 */

export interface MedicalLink {
  label: string;
  url: string;
}

/**
 * Obtiene la URL de un link médico desde env vars o usa fallback
 */
function getMedicalLinkUrl(envVar: string, fallback: string): string {
  if (import.meta.env[envVar]) {
    return import.meta.env[envVar];
  }
  return fallback;
}

export const MEDICAL_LINKS: MedicalLink[] = [
  {
    label: 'MisRX',
    url: getMedicalLinkUrl('VITE_MISRX_URL', 'https://mirx.com.ar'),
  },
  {
    label: 'Receto',
    url: getMedicalLinkUrl('VITE_RECETO_URL', 'https://receto.com.ar'),
  },
  {
    label: 'PAMI',
    url: getMedicalLinkUrl('VITE_PAMI_URL', 'https://www.pami.org.ar'),
  },
];
