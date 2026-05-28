/**
 * Modo aplicación médica (Cloudflare Worker).
 * Por defecto activo; setear VITE_APP_MODE=legacy para comportamiento anterior.
 */
export function isMedicalAppMode(): boolean {
  const mode = import.meta.env.VITE_APP_MODE?.trim().toLowerCase();
  if (mode === 'legacy') return false;
  return true;
}

/** Subida de documentos de paciente (no disponible en Worker aún). */
export function isResidentDocumentUploadEnabled(): boolean {
  return false;
}
