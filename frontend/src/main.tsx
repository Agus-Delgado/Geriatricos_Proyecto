import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// PRIMERO: Limpiar cualquier service worker viejo
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Service Worker viejo desregistrado');
        }
      });
    });
  });

  // Limpiar cachés viejos
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
}

// Esperar un momento para que se limpie todo, luego registrar el nuevo SW
setTimeout(() => {
  // Registrar Service Worker con manejo de actualizaciones
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new Event('pwa-update-available'));
    },
    onOfflineReady() {
      window.dispatchEvent(new Event('pwa-offline-ready'));
      console.log('App lista para funcionar offline');
    },
    onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration | undefined) {
      console.log(`Service Worker registrado: ${swUrl}`);
      
      if (r) {
        setInterval(() => {
          r.update().catch(() => {});
        }, 60000);
      }
    },
    onRegisterError(error: Error) {
      console.error('Error al registrar SW:', error);
    }
  });

  (window as any).__PWA_UPDATE_SW__ = updateSW;
}, 1000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);