import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
 * IMPORTANTE: Este componente NUNCA debe usar throw.
 * Todos los errores se manejan con estado y redirecciones.
 */

// Rutas públicas que NO requieren validación de sesión
const PUBLIC_ROUTES = ['/login', '/register', '/verify-email', '/reset-password'];

export const SessionBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, loading: authLoading, isBootstrapping, clearActiveFacility } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<BootstrapStatus>('checking');
  const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectGuardRef = useRef(false); // Prevenir loops de redirect
  const bootstrapAttemptedRef = useRef(false); // Prevenir múltiples intentos

  // Bootstrap principal - TODO encapsulado en try/catch
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        // Checkpoint: inicio
        console.log('[SessionBootstrap] start', { 
          path: location.pathname,
          hasToken: !!token,
          hasUser: !!user,
          authLoading,
          isBootstrapping
        });

        // Si ya intentamos bootstrap, no reintentar
        if (bootstrapAttemptedRef.current && status !== 'checking') {
          console.log('[SessionBootstrap] bootstrap ya intentado, skip');
          return;
        }

        // Si estamos en una ruta pública, NO hacer validación (evitar loops)
        const isPublicRoute = PUBLIC_ROUTES.some(route => 
          location.pathname === route || location.pathname.startsWith(route + '/')
        );
        
        if (isPublicRoute) {
          console.log('[SessionBootstrap] ruta pública detectada, marcar ready');
          if (!cancelled) {
            setStatus('ready');
          }
          return;
        }

        // Esperar a que AuthContext termine de cargar y bootstrap esté completo
        if (authLoading || isBootstrapping) {
          console.log('[SessionBootstrap] esperando auth context...', { authLoading, isBootstrapping });
          return;
        }

        // Checkpoint: verificar token
        const storedToken = localStorage.getItem('token');
        console.log('[SessionBootstrap] token check', { 
          hasStoredToken: !!storedToken,
          hasContextToken: !!token
        });

        // Si no hay token y NO estamos en ruta pública, redirigir a login
        if (!token && !storedToken) {
          console.log('[SessionBootstrap] sin token, redirigir a login');
          if (redirectGuardRef.current || cancelled) {
            if (!cancelled) setStatus('ready');
            return;
          }
          redirectGuardRef.current = true;
          if (!cancelled) {
            setStatus('redirecting');
            clearSessionStorage();
            navigate('/login', { replace: true });
          }
          return;
        }

        // Si ya hay user cargado, validar activeFacilityId
        if (user) {
          console.log('[SessionBootstrap] user cargado, validar facility');
          try {
            await validateActiveFacility(user);
            if (!cancelled) {
              setStatus('ready');
              bootstrapAttemptedRef.current = true;
            }
          } catch (err) {
            // validateActiveFacility nunca debería lanzar, pero por seguridad
            console.error('[SessionBootstrap] error en validateActiveFacility', err);
            if (!cancelled) {
              // En caso de error, limpiar y redirigir a login
              handleBootstrapError(err, 'validateActiveFacility');
            }
          }
          return;
        }

        // Si hay token pero no user (caso de rehidratación), validar con /me
        if (token || storedToken) {
          console.log('[SessionBootstrap] token sin user, validar con /me');
          try {
            if (!cancelled) setStatus('checking');
            const userData = await authApi.getCurrentUser();
            console.log('[SessionBootstrap] /me response', { hasUserData: !!userData });
            
            // Validar activeFacilityId
            try {
              await validateActiveFacility(userData);
              if (!cancelled) {
                setStatus('ready');
                bootstrapAttemptedRef.current = true;
              }
            } catch (err) {
              console.error('[SessionBootstrap] error en validateActiveFacility después de /me', err);
              if (!cancelled) {
                handleBootstrapError(err, 'validateActiveFacility_after_me');
              }
            }
          } catch (err) {
            const errTyped = err as Partial<ApiError> & { message?: string };
            const msg =
              (typeof errTyped?.message === 'string' ? errTyped.message : '') ||
              (typeof errTyped?.detail === 'string' ? errTyped.detail : '') ||
              'Error inesperado';
            console.error('[SessionBootstrap] error en /me', {
              status: errTyped.status,
              message: msg,
              error: err
            });
            
            // Si es 401/403, limpiar y redirigir a login
            if (errTyped.status === 401 || errTyped.status === 403) {
              console.log('[SessionBootstrap] 401/403, limpiar sesión y redirigir');
              if (!cancelled) {
                clearSessionStorage();
                if (!redirectGuardRef.current) {
                  redirectGuardRef.current = true;
                  setStatus('redirecting');
                  navigate('/login', { replace: true });
                } else {
                  setStatus('ready');
                }
              }
              return;
            }
            
            // Otros errores: log detallado y recuperación
            if (!cancelled) {
              handleBootstrapError(err, 'auth_me_failed');
            }
          }
        }
      } catch (e) {
        // Catch general para cualquier error inesperado
        console.error('[SessionBootstrap] bootstrap error (catch general)', e);
        if (!cancelled) {
          handleBootstrapError(e, 'bootstrap_general');
        }
      }
    };

    const handleBootstrapError = (err: unknown, context: string) => {
      // Normalizar error
      const normalized = err instanceof Error 
        ? err 
        : new Error(typeof err === 'string' ? err : JSON.stringify(err));
      
      console.error('[SessionBootstrap] normalized error', {
        context,
        name: normalized.name,
        message: normalized.message || 'Error sin mensaje',
        stack: normalized.stack,
        originalError: err
      });

      // RECUPERACIÓN: limpiar sesión y mandar a login SIN throw
      try {
        clearSessionStorage();
      } catch (clearErr) {
        console.warn('[SessionBootstrap] error al limpiar storage', clearErr);
      }

      if (!redirectGuardRef.current) {
        redirectGuardRef.current = true;
        setStatus('redirecting');
        navigate('/login?reason=bootstrap_error', { replace: true });
      } else {
        // Si ya redirigimos, solo marcar como ready para evitar loops
        setStatus('ready');
      }
    };

    const validateActiveFacility = async (userData: typeof user): Promise<void> => {
      if (!userData) {
        console.log('[SessionBootstrap] validateActiveFacility: sin userData');
        return;
      }

      try {
        const storedFacilityId = localStorage.getItem('activeFacilityId');
        const facilityIdToCheck = userData.active_facility_id || storedFacilityId;
        console.log('[SessionBootstrap] validateActiveFacility', {
          userFacilityId: userData.active_facility_id,
          storedFacilityId,
          facilityIdToCheck,
          isPlatformAdmin: userData.is_platform_admin,
          membershipsCount: userData.memberships?.length || 0
        });

        // Platform admin puede no tener facility
        if (userData.is_platform_admin) {
          if (!facilityIdToCheck) {
            console.log('[SessionBootstrap] platform admin sin facility, OK');
            clearActiveFacility();
            return;
          }
          // Si tiene facility, validar que esté en memberships
          if (facilityIdToCheck && userData.memberships) {
            const hasMembership = userData.memberships.length === 0 || 
              userData.memberships.some(m => m.facility_id === facilityIdToCheck && m.is_active);
            if (!hasMembership) {
              console.log('[SessionBootstrap] platform admin con facility inválida, limpiar');
              clearActiveFacility();
            }
          }
          return;
        }

        // Para usuarios normales: validar que activeFacilityId esté en memberships activos
        if (facilityIdToCheck) {
          const activeMemberships = userData.memberships?.filter(m => m.is_active) ?? [];
          const hasValidMembership = activeMemberships.some(m => m.facility_id === facilityIdToCheck);
          
          console.log('[SessionBootstrap] validar membership', {
            facilityIdToCheck,
            activeMembershipsCount: activeMemberships.length,
            hasValidMembership
          });
          
          if (!hasValidMembership) {
            console.log('[SessionBootstrap] facility inválida, limpiar y redirigir');
            clearActiveFacility();
            
            // Limpiar solo caches relacionados, NO el token
            try {
              const keysToRemove: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('facility_') || key.startsWith('cache_'))) {
                  keysToRemove.push(key);
                }
              }
              keysToRemove.forEach(key => localStorage.removeItem(key));
            } catch (clearErr) {
              console.warn('[SessionBootstrap] error al limpiar caches', clearErr);
            }
            
            // Redirigir a seleccionar hogar
            if (!redirectGuardRef.current && !cancelled) {
              redirectGuardRef.current = true;
              setStatus('redirecting');
              navigate('/select-facility', { replace: true });
            }
            return;
          }
        } else {
          // No hay facility activa, redirigir a seleccionar
          const activeMemberships = userData.memberships?.filter(m => m.is_active) ?? [];
          if (activeMemberships.length > 0) {
            console.log('[SessionBootstrap] sin facility pero hay memberships, redirigir');
            if (!redirectGuardRef.current && !cancelled) {
              redirectGuardRef.current = true;
              setStatus('redirecting');
              navigate('/select-facility', { replace: true });
            }
            return;
          }
        }
        
        console.log('[SessionBootstrap] validateActiveFacility OK');
      } catch (err) {
        // Si hay error accediendo a propiedades, loguear pero NO lanzar
        console.error('[SessionBootstrap] error en validateActiveFacility', {
          err,
          hasUserData: !!userData
        });
        // NO usar throw - solo loguear y continuar
      }
    };

    // Ejecutar bootstrap
    bootstrap();

    // Cleanup
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, authLoading, isBootstrapping, location.pathname, navigate]);

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
        // Solo redirigir si no estamos ya en login
        if (location.pathname !== '/login') {
          navigate('/login?reason=inactivity', { replace: true });
        }
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
  }, [token, user, location.pathname, navigate]);

  // Render condicional basado en estado
  // NUNCA navegar durante render - solo mostrar UI
  if (status === 'checking' || authLoading || isBootstrapping) {
    return <LoadingSpinner fullScreen />;
  }

  if (status === 'redirecting') {
    // Durante redirect, mostrar loader simple (nunca throw)
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
    // En caso de error, redirigir a login en lugar de mostrar UI de error
    // Esto evita que el usuario quede atrapado
    if (!redirectGuardRef.current) {
      redirectGuardRef.current = true;
      // Usar setTimeout para asegurar que la navegación ocurra después del render
      setTimeout(() => {
        clearSessionStorage();
        navigate('/login?reason=bootstrap_error', { replace: true });
      }, 0);
    }
    // Mientras tanto, mostrar loader
    return <LoadingSpinner fullScreen />;
  }

  // status === 'ready'
  return <>{children}</>;
};
