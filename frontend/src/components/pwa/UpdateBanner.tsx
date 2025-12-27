import React from 'react';
import { usePWA } from '../../contexts/PWAContext';

export const UpdateBanner: React.FC = () => {
  const { needRefresh, updateServiceWorker } = usePWA();

  const handleUpdate = async () => {
    if (updateServiceWorker) {
      // Llamar a updateSW(true) para actualizar y recargar la página
      await updateServiceWorker(true);
    }
  };

  if (!needRefresh || !updateServiceWorker) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#1d4ed8',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ flex: 1, marginRight: '1rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
          Nueva versión disponible
        </div>
        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
          Actualiza para obtener las últimas mejoras
        </div>
      </div>
      <button
        onClick={handleUpdate}
        style={{
          backgroundColor: 'white',
          color: '#1d4ed8',
          fontWeight: 600,
          padding: '0.5rem 1.5rem',
          borderRadius: '0.5rem',
          border: 'none',
          cursor: 'pointer',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        Actualizar
      </button>
    </div>
  );
};
