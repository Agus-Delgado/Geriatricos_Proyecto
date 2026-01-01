import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registrar Service Worker con manejo de actualizaciones
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Disparar evento personalizado para que UpdateBanner lo capture
    window.dispatchEvent(new Event('pwa-update-available'));
  },
  onOfflineReady() {
    window.dispatchEvent(new Event('pwa-offline-ready'));
    console.log('App lista para funcionar offline');
  },
  onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration | undefined) {
    console.log(`Service Worker registrado: ${swUrl}`);
    
    // Chequear actualizaciones cada 60 segundos
    if (r) {
      setInterval(() => {
        r.update().catch(() => {
          // Silenciar errores de actualización
        });
      }, 60000);
    }
  },
  onRegisterError(error: Error) {
    console.error('Error al registrar SW:', error);
  }
});

// Exponer updateSW globalmente para que PWAContext lo pueda usar
(window as any).__PWA_UPDATE_SW__ = updateSW;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
  
);

