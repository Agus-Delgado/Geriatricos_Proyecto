import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Self-heal para errores de chunks/workbox: solo intenta una vez para evitar loops infinitos
const SW_RECOVER_KEY = '__sw_recover_attempted__';
const SW_RECOVER_FAILED_KEY = '__sw_recover_failed__';

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
 */
async function performSelfHeal(): Promise<void> {
  const alreadyAttempted = sessionStorage.getItem(SW_RECOVER_KEY);
  if (alreadyAttempted === '1') {
    // Ya se intentó una vez, no recargar más para evitar loop
    sessionStorage.setItem(SW_RECOVER_FAILED_KEY, '1');
    console.error('[Self-heal] Ya se intentó reparar una vez. No se recargará más para evitar loop infinito.');
    return;
  }

  // Marcar que se intentó
  sessionStorage.setItem(SW_RECOVER_KEY, '1');

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
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('original_token');
      localStorage.removeItem('activeFacilityId');
      console.log('[Self-heal] Storage de sesión limpiado');
    } catch (err) {
      console.warn('[Self-heal] Error al limpiar storage:', err);
    }

    // 4. Recargar UNA sola vez
    console.log('[Self-heal] Recargando página...');
    window.location.reload();
  } catch (err) {
    console.error('[Self-heal] Error durante reparación:', err);
    sessionStorage.setItem(SW_RECOVER_FAILED_KEY, '1');
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
const resetParams = new URLSearchParams(window.location.search);
if (resetParams.get('reset') === '1') {
  try {
    localStorage.clear();
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
// Si cambia entre sesiones, limpiar localStorage y recargar
const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || new Date().toISOString().split('T')[0];
const STORAGE_KEY = 'APP_BUILD_ID';

const storedBuildId = localStorage.getItem(STORAGE_KEY);
if (storedBuildId && storedBuildId !== APP_BUILD_ID) {
  // Build cambió, limpiar caches y storage relacionado
  console.log('Build ID cambió, limpiando cache...');
  
  // Limpiar localStorage (excepto token y algunos valores críticos)
  const keysToKeep = ['token', 'original_token'];
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
  
  // Recargar página para aplicar cambios
  window.location.reload();
} else if (!storedBuildId) {
  // Primera vez, guardar BUILD_ID
  localStorage.setItem(STORAGE_KEY, APP_BUILD_ID);
}

// Registrar service worker para PWA (opcional: puede desactivarse con VITE_DISABLE_PWA=true)
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

const shouldDisablePWA = import.meta.env.PROD && import.meta.env.VITE_DISABLE_PWA === 'true';

if (!shouldDisablePWA && 'serviceWorker' in navigator) {
  try {
    updateSW = registerSW({
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
      onRegisterError(error) {
        console.error('[PWA] Error al registrar service worker:', error);
        // Si falla el registro, no bloquear la app
      },
    });

    // Guardar updateSW en window para acceso desde React
    (window as any).__PWA_UPDATE_SW__ = updateSW;
  } catch (err) {
    console.error('[PWA] Error al inicializar service worker:', err);
  }
} else if (shouldDisablePWA) {
  console.log('[PWA] Service Worker desactivado por VITE_DISABLE_PWA=true');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
