import { isMedicalAppMode } from '../config/appMode';

/** Rutas con shell visual médico (médico y platform_admin). */
export function isOnMedicalUiRoute(pathname: string): boolean {
  if (/^\/g\/[^/]+\/medical(\/|$)/.test(pathname)) return true;
  if (pathname.startsWith('/residents')) return true;
  if (pathname.startsWith('/clinical-history')) return true;
  if (pathname.startsWith('/medical-folder')) return true;
  if (pathname.startsWith('/prescriptions-history')) return true;
  if (/^\/g\/[^/]+\/certificates(\/|$)/.test(pathname)) return true;
  return false;
}

/** Banners de versión, release notes y prompts PWA similares. */
export function shouldSuppressMedicalDistractions(): boolean {
  return isMedicalAppMode();
}

/** Layout violeta, modal medical, etc. */
export function shouldUseMedicalUi(pathname: string): boolean {
  return isMedicalAppMode() && isOnMedicalUiRoute(pathname);
}
