import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Self-heal para errores de chunks/workbox: solo intenta una vez para evitar loops infinitos
// IMPORTANTE: Usar localStorage (no sessionStorage) para que el guard persista incluso si se limpia sessionStorage
const SW_RECOVER_KEY = '__sw_recover_attempted__';
const SW_RECOVER_FAILED_KEY = '__sw_recover_failed__';

// Guard en memoria para evitar múltiples self-heal concurrentes
let selfHealInProgress = false;

/**
 * Detecta si un error es relacionado con chunks/workbox
 */
function isChunkOrWorkboxError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes('loading chunk') ||
    lowerMessage.includes('chunkloaderror') ||
    lowerMessage.includes('failed to fetch dynamically imported module') ||
    lowerMessage.includes('workbox') ||
    lowerMessage.includes('failed to load module') ||
    lowerMessage.includes('importing a module script failed')
  );
}

/**
 * Self-heal: desregistra SW, limpia caches y recarga UNA sola vez
 * IMPORTANTE: Usa localStorage para el guard (no sessionStorage) para que persista
 */
async function performSelfHeal(): Promise<void> {
  // Guard en memoria: evitar múltiples self-heal concurrentes
  if (selfHealInProgress) {
    console.warn('[Self-heal] Ya hay un self-heal en progreso, ignorando...');
    return;
  }

  // Verificar si ya se intentó (usar localStorage para que persista)
  const alreadyAttempted = localStorage.getItem(SW_RECOVER_KEY);
  if (alreadyAttempted === '1') {
    // Ya se intentó una vez, no recargar más para evitar loop
    localStorage.setItem(SW_RECOVER_FAILED_KEY, '1');
    console.error('[Self-heal] Ya se intentó reparar una vez. No se recargará más para evitar loop infinito.');
    return;
  }

  // Marcar en memoria y localStorage INMEDIATAMENTE (antes de limpiar nada)
  selfHealInProgress = true;
  localStorage.setItem(SW_RECOVER_KEY, '1');

  try {
    console.warn('[Self-heal] Iniciando reparación automática...');

    // 1. Desregistrar todos los service workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
        console.log('[Self-heal] Service Workers desregistrados');
      } catch (err) {
        console.warn('[Self-heal] Error al desregistrar SW:', err);
      }
    }

    // 2. Limpiar Cache Storage
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        console.log('[Self-heal] Cache Storage limpiado');
      } catch (err) {
        console.warn('[Self-heal] Error al limpiar caches:', err);
      }
    }

    // 3. Limpiar storage de sesión para evitar estados raros
    // IMPORTANTE: NO borrar keys __sw_* (son el guard contra loops)
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('original_token');
      localStorage.removeItem('activeFacilityId');
      console.log('[Self-heal] Storage de sesión limpiado (guard __sw_* preservado)');
    } catch (err) {
      console.warn('[Self-heal] Error al limpiar storage:', err);
    }

    // 4. Recargar UNA sola vez (simple reload, no navegación con query params)
    // El bootstrap script en index.html ya maneja ?recover=1 si es necesario
    // Marcar como recarga programada para evitar que auto-logout interfiera
    sessionStorage.setItem('__programmed_reload__', '1');
    console.log('[Self-heal] Recargando página...');
    window.location.reload();
  } catch (err) {
    console.error('[Self-heal] Error durante reparación:', err);
    localStorage.setItem(SW_RECOVER_FAILED_KEY, '1');
    selfHealInProgress = false; // Reset guard en memoria
    // NO recargar si falla para evitar loop
  }
}

// Handlers globales para capturar errores no manejados
window.addEventListener('error', (event) => {
  const error = event.error || event.message;
  const message = String(error?.message || error || '');
  
  // Manejo de chunk/workbox errors con self-heal
  if (isChunkOrWorkboxError(message)) {
    console.warn('[ChunkLoadError/Workbox] Detectado:', message);
    event.preventDefault();
    void performSelfHeal();
    return;
  }
  
  console.error('window.error:', error, event);
  
  // Si el error no es una instancia de Error, normalizarlo
  if (!(error instanceof Error)) {
    const normalized = typeof error === 'string' 
      ? new Error(error)
      : new Error(JSON.stringify(error));
    console.error('window.error (normalized):', normalized.message, normalized.stack);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = String(reason?.message || reason || '');
  
  // Manejo de chunk/workbox errors en promise rejections con self-heal
  if (isChunkOrWorkboxError(message)) {
    console.warn('[ChunkLoadError/Workbox] Detectado en promise rejection:', message);
    event.preventDefault();
    void performSelfHeal();
    return;
  }
  
  console.error('unhandledrejection:', reason, event);
  
  // Normalizar el reason si no es Error
  if (!(reason instanceof Error)) {
    const normalized = typeof reason === 'string'
      ? new Error(reason)
      : typeof reason === 'object' && reason !== null
      ? new Error(JSON.stringify(reason))
      : new Error(String(reason));
    console.error('unhandledrejection (normalized):', normalized.message, normalized.stack);
  }
});

// Reset por URL: ?reset=1 limpia todo el storage y caches
// IMPORTANTE: Preservar keys __sw_* y APP_BUILD_ID para evitar loops
const resetParams = new URLSearchParams(window.location.search);
if (resetParams.get('reset') === '1') {
  try {
    // NO usar localStorage.clear() - preservar keys críticas
    const keysToPreserve = ['__sw_recover_attempted__', '__sw_recover_failed__', 'APP_BUILD_ID'];
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToPreserve.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.warn('Error clearing localStorage:', e);
  }
  
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn('Error clearing sessionStorage:', e);
  }
  
  // Limpiar Cache Storage (PWA/Service Worker)
  const hasCaches = 'caches' in window;
  if (hasCaches) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .finally(() => {
        window.location.replace('/');
      });
  } else {
    window.location.replace('/');
  }
}

// APP_BUILD_ID: Usado para limpiar cache cuando cambia el deploy
// IMPORTANTE: Solo actuar si VITE_APP_BUILD_ID está definido (no usar fecha como fallback)
// Preservar keys __sw_* para evitar loops infinitos
const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID;
const STORAGE_KEY = 'APP_BUILD_ID';

// Solo procesar si hay un BUILD_ID definido (no usar fecha como fallback para evitar recargas inesperadas)
// IMPORTANTE: NO recargar si ya hay un self-heal fallido (evitar loops)
if (APP_BUILD_ID) {
  const storedBuildId = localStorage.getItem(STORAGE_KEY);
  const hasRecoveryFailed = localStorage.getItem('__sw_recover_failed__') === '1';
  
  // Si hay un recovery fallido, NO hacer reload automático (evitar loops)
  if (hasRecoveryFailed) {
    console.warn('[APP_BUILD_ID] Detectado cambio de build, pero hay recovery fallido. No se recargará para evitar loop.');
    // Solo actualizar el BUILD_ID sin recargar
    if (!storedBuildId || storedBuildId !== APP_BUILD_ID) {
      localStorage.setItem(STORAGE_KEY, APP_BUILD_ID);
    }
  } else if (storedBuildId && storedBuildId !== APP_BUILD_ID) {
    // Build cambió, limpiar caches y storage relacionado
    console.log('Build ID cambió, limpiando cache...');
    
    // Limpiar localStorage (excepto keys críticas: auth y guards de recovery)
    const keysToKeep = ['token', 'original_token', '__sw_recover_attempted__', '__sw_recover_failed__', STORAGE_KEY];
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Guardar nuevo BUILD_ID
    localStorage.setItem(STORAGE_KEY, APP_BUILD_ID);
    
    // Recargar página para aplicar cambios (solo si no hay recovery fallido)
    window.location.reload();
  } else if (!storedBuildId) {
    // Primera vez, guardar BUILD_ID
    localStorage.setItem(STORAGE_KEY, APP_BUILD_ID);
  }
}

// Registrar service worker para PWA con import dinámico (lazy)
// IMPORTANTE: Usar import dinámico para que workbox NO se cargue si VITE_DISABLE_PWA=true
// Esto evita que workbox-window.prod.es5.js falle y cause loops infinitos
const shouldDisablePWA = import.meta.env.PROD && import.meta.env.VITE_DISABLE_PWA === 'true';

async function initPWA(): Promise<void> {
  if (shouldDisablePWA) {
    console.log('[PWA] Desactivado por VITE_DISABLE_PWA=true');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    // Import dinámico: solo carga workbox si PWA está habilitada
    const mod = await import('virtual:pwa-register');
    const { registerSW } = mod;

    const updateSW = registerSW({
      onNeedRefresh() {
        // Disparar evento personalizado cuando hay una nueva versión
        const event = new CustomEvent('pwa-update-available');
        window.dispatchEvent(event);
      },
      onOfflineReady() {
        // Disparar evento cuando la app está lista para offline
        const event = new CustomEvent('pwa-offline-ready');
        window.dispatchEvent(event);
      },
      onRegisterError(error: unknown) {
        console.error('[PWA] Error al registrar service worker:', error);
        // Si falla el registro, no bloquear la app
      },
    });

    // Guardar updateSW en window para acceso desde React
    (window as any).__PWA_UPDATE_SW__ = updateSW;
  } catch (err) {
    // CRÍTICO: si falla workbox, NO romper la app ni recargar en loop
    console.error('[PWA] Falló import dinámico de virtual:pwa-register:', err);
    // NO lanzar error, solo loguear
  }
}

// Inicializar PWA de forma asíncrona (no bloquea el render)
void initPWA();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
