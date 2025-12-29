import React, { useEffect, useState } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFacility } from '../../contexts/FacilityContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
  requireFacility?: boolean;
  requireRole?: 'ADMIN' | 'MEDICO' | 'STAFF';
  requirePlatformAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOwner = false,
  requireFacility = true,
  requireRole,
  requirePlatformAdmin = false,
}) => {
  const {
    user,
    token,
    loading: authLoading,
    isOwner,
    isPlatformAdmin,
    getActiveRole,
    activeFacilityId,
    setActiveFacility,
    getMemberships,
  } = useAuth();

  const { facility, loading: facilityLoading } = useFacility();

  const params = useParams();
  const location = useLocation();

  const [syncingFacility, setSyncingFacility] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);

  // Detectar ruta /g/:id/*
  const urlFacilityId = params.id;
  const isGeriatricRoute = location.pathname.startsWith('/g/');

  // 1) Token primero
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2) Mientras rehidrata auth, spinner
  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // 3) Si hay token pero no user, cortar (evita loop)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // A partir de acá ya sabemos si es platform admin
  const mustHaveFacility = requireFacility && !isPlatformAdmin;

  // Si es platform admin y la ruta requiere platform admin, ok; si lo requiere y no lo es, se corta abajo.
  // Importante: NO bloquear por facilityLoading si NO necesitamos facility.
  if (mustHaveFacility && (facilityLoading || syncingFacility)) {
    return <LoadingSpinner fullScreen />;
  }

  // Si la sincronización de facility falló, no seguir spinners eternos
  if (mustHaveFacility && syncFailed) {
    return <Navigate to="/select-facility" replace />;
  }

  // Verificar platform admin si es requerido
  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/residents" replace />;
  }

  // Verificar owner legacy si es requerido
  if (requireOwner && !isOwner) {
    return <Navigate to="/residents" replace />;
  }

  // Sincronizar activeFacilityId con :id de la URL para /g/:id/*
  useEffect(() => {
    if (!mustHaveFacility) return;

    // Resetear estado de error cuando cambia la URL facility
    setSyncFailed(false);

    if (isGeriatricRoute && urlFacilityId && user) {
      const memberships = getMemberships();
      const hasMembership = memberships.some(
        (m) => m.facility_id === urlFacilityId && m.is_active
      );

      if (!hasMembership) return;

      // Si difiere, sincronizar una vez
      if (activeFacilityId !== urlFacilityId) {
        setSyncingFacility(true);
        setActiveFacility(urlFacilityId)
          .catch(() => {
            // Si falla, marcar y cortar (evita loop infinito)
            setSyncFailed(true);
          })
          .finally(() => {
            setSyncingFacility(false);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFacilityId, activeFacilityId, mustHaveFacility, isGeriatricRoute, user]);

  // Verificar facility si es requerida (para no platform admin)
  if (mustHaveFacility) {
    // Caso /g/:id/*
    if (isGeriatricRoute && urlFacilityId) {
      const memberships = getMemberships();
      const hasMembership = memberships.some(
        (m) => m.facility_id === urlFacilityId && m.is_active
      );

      if (!hasMembership) {
        return <Navigate to="/select-facility" replace />;
      }

      // Si todavía no se sincronizó, mostrar spinner (solo mientras intenta)
      if (!activeFacilityId && !syncFailed) {
        return <LoadingSpinner fullScreen />;
      }
    } else {
      // No es /g/:id/*
      if (!facility && !activeFacilityId) {
        return <Navigate to="/select-facility" replace />;
      }
    }
  }

  // Verificar rol requerido en facility (si no es platform admin)
  if (requireRole && !isPlatformAdmin) {
    let roleToCheck: 'ADMIN' | 'MEDICO' | 'STAFF' | null = null;

    if (isGeriatricRoute && urlFacilityId) {
      const memberships = getMemberships();
      const membership = memberships.find(
        (m) => m.facility_id === urlFacilityId && m.is_active
      );
      roleToCheck = membership?.role ?? null;
    } else {
      roleToCheck = getActiveRole();
    }

    if (roleToCheck !== requireRole) {
      const currentFacilityId = urlFacilityId ?? activeFacilityId ?? user.active_facility_id;
      if (currentFacilityId) {
        if (roleToCheck === 'ADMIN') {
          return <Navigate to={`/g/${currentFacilityId}/dashboard`} replace />;
        }
        if (roleToCheck === 'MEDICO') {
          return <Navigate to={`/g/${currentFacilityId}/medical`} replace />;
        }
        if (roleToCheck === 'STAFF') {
          return <Navigate to={`/g/${currentFacilityId}/tasks`} replace />;
        }
      }
      return <Navigate to="/select-facility" replace />;
    }
  }

  return <>{children}</>;
};
