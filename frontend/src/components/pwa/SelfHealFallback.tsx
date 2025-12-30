import React, { useEffect, useState } from 'react';

// IMPORTANTE: Usar localStorage (no sessionStorage) para que el guard persista
const SW_RECOVER_FAILED_KEY = '__sw_recover_failed__';

/**
 * Componente fallback que se muestra cuando el self-heal falla
 * Permite al usuario intentar reparar manualmente
 */
export const SelfHealFallback: React.FC = () => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Verificar si el self-heal falló (usar localStorage para que persista)
    const failed = localStorage.getItem(SW_RECOVER_FAILED_KEY);
    if (failed === '1') {
      setShowFallback(true);
    }
  }, []);

  const handleRepair = () => {
    // Navegar a la misma app con ?recover=1 para que el bootstrap script ejecute la limpieza
    // Esto asegura que la limpieza ocurra ANTES de cargar el bundle
    const url = new URL(window.location.href);
    url.searchParams.set('recover', '1');
    // Limpiar solo el flag de fallo para permitir un nuevo intento
    // NO borrar SW_RECOVER_KEY para evitar reintentos peligrosos automáticos
    localStorage.removeItem(SW_RECOVER_FAILED_KEY);
    window.location.href = url.toString();
  };

  const handleDismiss = () => {
    // NO borrar el flag de fallo al cerrar, para que se muestre de nuevo si el problema persiste
    // El usuario puede usar el botón "Reparar" cuando quiera
    setShowFallback(false);
  };

  if (!showFallback) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '28rem',
          width: '100%',
          borderRadius: '0.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '1.5rem',
          backgroundColor: 'white',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem',
            }}
          >
            Hubo una actualización
          </h1>
          <p
            style={{
              color: '#4b5563',
              marginBottom: '1.5rem',
            }}
          >
            La aplicación detectó un problema con archivos en caché. Por favor, repará la aplicación
            o cerrá y volvé a abrir la pestaña.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={handleRepair}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                backgroundColor: '#667eea',
                color: 'white',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                pointerEvents: 'auto',
                minHeight: '44px',
                minWidth: '120px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5568d3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#667eea';
              }}
            >
              Reparar
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                fontWeight: '500',
                border: '1px solid #d1d5db',
                cursor: 'pointer',
                fontSize: '0.875rem',
                pointerEvents: 'auto',
                minHeight: '44px',
                minWidth: '120px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
