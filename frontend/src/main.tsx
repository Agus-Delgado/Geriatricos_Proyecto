import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Desactivar PWA completamente: desregistrar todos los service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
