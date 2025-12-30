import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { ApiError } from '../../api/client';

/**
 * Componente que valida la sesión antes de renderizar la UI.
 * - Valida token con /me
 * - Valida activeFacilityId contra memberships
 * - Limpia caches si hay inconsistencias
 * - Redirige a login o select-facility según corresponda
 */
export const SessionBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, loading: authLoading, activeFacilityId, clearActiveFacility } = useAuth();
  const navigate = useNavigate();
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      // Esperar a que AuthContext termine de cargar
      if (authLoading) {
        return;
      }

      // Si no hay token, dejar que el flujo normal maneje (redirect a login)
      if (!token) {
        setValidating(false);
        return;
      }

      // Si ya hay user cargado, validar activeFacilityId
      if (user) {
        await validateActiveFacility(user);
        setValidating(false);
        return;
      }

      // Si hay token pero no user (caso de rehidratación), validar con /me
      try {
        setValidating(true);
        const userData = await authApi.getCurrentUser();
        
        // Validar activeFacilityId
        await validateActiveFacility(userData);
        
        setValidating(false);
      } catch (err) {
        const apiError = err as Partial<ApiError>;
        
        // Si es 401/403, limpiar y redirigir a login
        if (apiError.status === 401 || apiError.status === 403) {
          // Limpiar manualmente
          localStorage.removeItem('token');
          localStorage.removeItem('original_token');
          localStorage.removeItem('activeFacilityId');
          // Usar window.location para garantizar navegación incluso si router está roto
          window.location.assign('/login');
          return;
        }
        
        // Otros errores: mostrar error pero continuar
        console.error('SessionBootstrap: Error al validar sesión', err);
        setValidationError('Error al validar sesión');
        setValidating(false);
      }
    };

    const validateActiveFacility = async (userData: typeof user) => {
      if (!userData) return;

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
          
          // Limpiar caches relacionados (si hay React Query u otro sistema de cache)
          // Por ahora solo limpiamos localStorage relacionado
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('facility_') || key.startsWith('cache_'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // Redirigir a seleccionar hogar (usar window.location para garantizar navegación)
          window.location.assign('/select-facility');
          return;
        }
      } else {
        // No hay facility activa, redirigir a seleccionar
        if (userData.memberships && userData.memberships.filter(m => m.is_active).length > 0) {
          window.location.assign('/select-facility');
          return;
        }
      }
    };

    validateSession();
  }, [token, user, authLoading, activeFacilityId, clearActiveFacility, navigate]);

  // Mientras valida, mostrar loader
  if (validating || authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Si hay error de validación, mostrar pero permitir continuar
  if (validationError) {
    console.warn('SessionBootstrap: Error de validación:', validationError);
  }

  // Si todo está bien, renderizar children
  return <>{children}</>;
};
