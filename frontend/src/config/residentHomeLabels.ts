/** Hogares visibles del paciente (editar nombres reales aquí). */
export const RESIDENT_HOME_LABELS = ['Hogar 1', 'Hogar 2', 'Hogar 3'] as const;

export type ResidentHomeLabel = (typeof RESIDENT_HOME_LABELS)[number];
