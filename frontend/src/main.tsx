import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

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
