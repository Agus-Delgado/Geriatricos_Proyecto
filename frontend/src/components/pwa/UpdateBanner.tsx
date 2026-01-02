import React from 'react';
import { usePWA } from '../../contexts/PWAContext';

export const UpdateBanner: React.FC = () => {
  const { needRefresh, updateServiceWorker } = usePWA();

  const handleUpdate = async () => {
    if (updateServiceWorker) {
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
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.2)',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
      
      <div style={{ flex: 1, marginRight: '1rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem' }}>
          🎉 Nueva versión disponible
        </div>
        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
          Actualiza para obtener las últimas mejoras y correcciones
        </div>
      </div>
      
      <button
        onClick={handleUpdate}
        style={{
          backgroundColor: 'white',
          color: '#2563eb',
          fontWeight: 600,
          padding: '0.625rem 1.5rem',
          borderRadius: '0.5rem',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.9375rem',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}
      >
        Actualizar ahora
      </button>
    </div>
  );
};