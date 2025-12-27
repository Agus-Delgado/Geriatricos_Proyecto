import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

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
