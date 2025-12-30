import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth';
import { clearSessionStorage, updateActivityTimestamp, checkInactivityTimeout } from '../../utils/session';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { ApiError } from '../../api/client';

type BootstrapStatus = 'checking' | 'ready' | 'redirecting' | 'error';

/**
 * Componente que valida la sesión antes de renderizar la UI.
 * - Valida token con /me
 * - Valida activeFacilityId contra memberships
 * - Limpia caches si hay inconsistencias
 * - Redirige a login o select-facility según corresponda
 * 
 * IMPORTANTE: Este componente NO debe usar throw en ningún caso.
 * Todos los errores se manejan con estado y redirecciones.
 */
export const SessionBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, loading: authLoading, isBootstrapping, activeFacilityId, clearActiveFacility } = useAuth();
  const [status, setStatus] = useState<BootstrapStatus>('checking');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Normaliza cualquier error a un string con mensaje explícito.
   * NUNCA retorna string vacío.
   */
  const normalizeError = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message || 'Error desconocido';
    }
    if (typeof err === 'string') {
      return err || 'Error desconocido';
    }
    if (typeof err === 'object' && err !== null) {
      try {
        const apiErr = err as Partial<ApiError> & { message?: string };
        if (apiErr.detail) return apiErr.detail;
        if (apiErr.message) return apiErr.message;
        const jsonStr = JSON.stringify(err);
        return jsonStr || 'Error desconocido';
      } catch {
        return String(err) || 'Error desconocido';
      }
    }
    return String(err) || 'Error desconocido';
  };

  useEffect(() => {
    const validateSession = async () => {
      // Esperar a que AuthContext termine de cargar y bootstrap esté completo
      if (authLoading || isBootstrapping) {
        return;
      }

      // Si no hay token, redirigir a login inmediatamente para evitar renders parciales
      if (!token) {
        setStatus('redirecting');
        clearSessionStorage();
        window.location.assign('/login');
        return;
      }

      // Si ya hay user cargado, validar activeFacilityId
      if (user) {
        try {
          await validateActiveFacility(user);
          setStatus('ready');
        } catch (err) {
          // validateActiveFacility nunca debería lanzar, pero por seguridad
          const errorMessage = normalizeError(err);
          console.error('SessionBootstrap: Error inesperado en validateActiveFacility', {
            err,
            errorMessage,
            context: { hasUser: !!user, activeFacilityId }
          });
          setErrorMsg(`SessionBootstrap: error inesperado al validar facility - ${errorMessage}`);
          setStatus('error');
        }
        return;
      }

      // Si hay token pero no user (caso de rehidratación), validar con /me
      try {
        setStatus('checking');
        const userData = await authApi.getCurrentUser();
        
        // Validar activeFacilityId
        try {
          await validateActiveFacility(userData);
          setStatus('ready');
        } catch (err) {
          // validateActiveFacility nunca debería lanzar, pero por seguridad
          const errorMessage = normalizeError(err);
          console.error('SessionBootstrap: Error inesperado en validateActiveFacility', {
            err,
            errorMessage,
            context: { hasUserData: !!userData, activeFacilityId }
          });
          setErrorMsg(`SessionBootstrap: error inesperado al validar facility - ${errorMessage}`);
          setStatus('error');
        }
      } catch (err) {
        const apiError = err as Partial<ApiError>;
        
        // Si es 401/403, limpiar y redirigir a login
        if (apiError.status === 401 || apiError.status === 403) {
          // Limpiar storage completo usando helper centralizado
          clearSessionStorage();
          
          // Usar window.location para garantizar navegación incluso si router está roto
          setStatus('redirecting');
          window.location.assign('/login');
          return;
        }
        
        // Otros errores: log detallado y mostrar UI de error
        const errorMessage = normalizeError(err);
        console.error('SessionBootstrap: error inesperado al validar sesión', {
          err,
          errorMessage,
          apiErrorStatus: apiError.status,
          context: { hasToken: !!token, authLoading }
        });
        setErrorMsg(`SessionBootstrap: error inesperado al validar sesión - ${errorMessage}`);
        setStatus('error');
      }
    };

    const validateActiveFacility = async (userData: typeof user): Promise<void> => {
      if (!userData) {
        return;
      }

      try {
        const storedFacilityId = localStorage.getItem('activeFacilityId');
        const facilityIdToCheck = userData.active_facility_id || storedFacilityId;

        // Platform admin puede no tener facility
        if (userData.is_platform_admin) {
          if (!facilityIdToCheck) {
            // No hay facility, está bien para platform admin
            clearActiveFacility();
            return;
          }
          // Si tiene facility, validar que esté en memberships (puede tener acceso a cualquier facility)
          if (facilityIdToCheck && userData.memberships) {
            const hasMembership = userData.memberships.length === 0 || 
              userData.memberships.some(m => m.facility_id === facilityIdToCheck && m.is_active);
            if (!hasMembership) {
              // Facility inválida, limpiar
              clearActiveFacility();
              // No redirigir, platform admin puede seguir sin facility
            }
          }
          return;
        }

        // Para usuarios normales: validar que activeFacilityId esté en memberships activos
        if (facilityIdToCheck) {
          const activeMemberships = userData.memberships?.filter(m => m.is_active) ?? [];
          const hasValidMembership = activeMemberships.some(m => m.facility_id === facilityIdToCheck);
          
          if (!hasValidMembership) {
            // activeFacilityId inválido, limpiar y redirigir a seleccionar hogar
            clearActiveFacility();
            
            // Limpiar solo caches relacionados, NO el token
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('facility_') || key.startsWith('cache_'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Redirigir a seleccionar hogar (usar window.location para garantizar navegación)
            setStatus('redirecting');
            window.location.assign('/select-facility');
            return;
          }
        } else {
          // No hay facility activa, redirigir a seleccionar
          if (userData.memberships && userData.memberships.filter(m => m.is_active).length > 0) {
            setStatus('redirecting');
            window.location.assign('/select-facility');
            return;
          }
        }
      } catch (err) {
        // Si hay error accediendo a propiedades, loguear y re-lanzar para que validateSession lo maneje
        const errorMessage = normalizeError(err);
        console.error('SessionBootstrap: Error accediendo a propiedades de userData', {
          err,
          errorMessage,
          context: { hasUserData: !!userData }
        });
        // NO usar throw - en su lugar, dejar que el código continúe
        // El error ya fue logueado, simplemente retornar
        // Si necesitamos propagar el error, lo haremos a través del estado
        // Por ahora, solo logueamos y continuamos
      }
    };

    validateSession();
  }, [token, user, authLoading, isBootstrapping, activeFacilityId, clearActiveFacility]);

  // Timeout por inactividad (60 minutos)
  useEffect(() => {
    if (!token || !user) {
      // Limpiar intervalo si no hay sesión
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
      return;
    }

    // Actualizar timestamp inicial
    updateActivityTimestamp();

    // Handler para actualizar timestamp en actividad
    const handleActivity = () => {
      updateActivityTimestamp();
    };

    // Eventos de actividad (throttled implícitamente por el intervalo)
    const activityEvents: (keyof WindowEventMap)[] = ['click', 'keydown', 'mousemove', 'scroll'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Verificar inactividad cada 5 minutos
    inactivityIntervalRef.current = setInterval(() => {
      if (checkInactivityTimeout(60)) {
        // Inactivo por más de 60 minutos, limpiar sesión y redirigir
        clearSessionStorage();
        window.location.assign('/login?reason=inactivity');
      }
    }, 5 * 60 * 1000); // 5 minutos

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
    };
  }, [token, user]);

  // Render condicional basado en estado
  // Bloquear render hasta que bootstrap esté completo Y validación de sesión termine
  if (status === 'checking' || authLoading || isBootstrapping) {
    return <LoadingSpinner fullScreen />;
  }

  if (status === 'redirecting') {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner />
          <p style={{ marginTop: '1rem', color: '#666' }}>Redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
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
              Error al validar sesión
            </h1>
            <p
              style={{
                color: '#4b5563',
                marginBottom: '1.5rem',
              }}
            >
              {errorMsg || 'Ocurrió un error inesperado al validar tu sesión.'}
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
                onClick={() => window.location.reload()}
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
                Recargar
              </button>
              <button
                type="button"
                onClick={() => window.location.assign('/')}
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
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // status === 'ready'
  return <>{children}</>;
};
