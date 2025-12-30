import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Handlers globales para capturar errores no manejados
window.addEventListener('error', (event) => {
  const error = event.error || event.message;
  const message = String(error?.message || error || '');
  
  // Manejo de chunk load errors (común en Vercel post-deploy)
  if (message.includes('Loading chunk') || message.includes('ChunkLoadError') || message.includes('Failed to fetch dynamically imported module')) {
    console.warn('[ChunkLoadError] Detectado, recargando...');
    window.location.reload();
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
  
  // Manejo de chunk load errors en promise rejections
  if (message.includes('Loading chunk') || message.includes('ChunkLoadError') || message.includes('Failed to fetch dynamically imported module')) {
    console.warn('[ChunkLoadError] Detectado en promise rejection, recargando...');
    event.preventDefault(); // Prevenir log en consola
    window.location.reload();
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

// Registrar service worker para PWA
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

if ('serviceWorker' in navigator) {
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
  });

  // Guardar updateSW en window para acceso desde React
  (window as any).__PWA_UPDATE_SW__ = updateSW;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
