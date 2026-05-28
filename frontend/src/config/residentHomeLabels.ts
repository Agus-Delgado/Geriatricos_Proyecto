/** Hogares visibles del paciente (editar nombres reales aquí). */
export const RESIDENT_HOME_LABELS = [
  'Nuestra Señora de Luján',
  'El Trébol',
  'El Amanecer',
] as const;

export type ResidentHomeLabel = (typeof RESIDENT_HOME_LABELS)[number];
