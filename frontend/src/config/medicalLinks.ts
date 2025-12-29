/**
 * Configuración de links externos para recetas médicas
 * En el futuro, estos valores pueden venir de variables de entorno
 */

export interface MedicalLink {
  name: string;
  url: string;
}

export const MEDICAL_LINKS: MedicalLink[] = [
  {
    name: 'MiRx',
    url: 'https://mirx.com.ar', // TODO: Reemplazar con URL real
  },
  {
    name: 'Receto',
    url: 'https://receto.com.ar', // TODO: Reemplazar con URL real
  },
  {
    name: 'PAMI',
    url: 'https://www.pami.org.ar', // TODO: Reemplazar con URL real
  },
];
