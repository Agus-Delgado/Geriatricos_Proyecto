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
  const { user, token, loading: authLoading, isOwner, isPlatformAdmin, getActiveRole, activeFacilityId, setActiveFacility, getMemberships } = useAuth();
  const { facility, loading: facilityLoading } = useFacility();
  const params = useParams();
  const location = useLocation();
  const [syncingFacility, setSyncingFacility] = useState(false);
  
  // Detectar si estamos en una ruta /g/:id/*
  const urlFacilityId = params.id;
  const isGeriatricRoute = location.pathname.startsWith('/g/');

  // Sincronizar activeFacilityId con el parámetro :id de la URL
  useEffect(() => {
    if (requireFacility && isGeriatricRoute && urlFacilityId && user && !authLoading) {
      const memberships = getMemberships();
      const hasMembership = memberships.some(m => m.facility_id === urlFacilityId && m.is_active);
      
      // Si el usuario tiene membership para este id y difiere del activeFacilityId, sincronizar
      if (hasMembership && activeFacilityId !== urlFacilityId) {
        setSyncingFacility(true);
        setActiveFacility(urlFacilityId)
          .catch(() => {
            // Error manejado por el catch, no hacer nada aquí
          })
          .finally(() => {
            setSyncingFacility(false);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFacilityId, activeFacilityId, requireFacility, isGeriatricRoute, user, authLoading]);

  // Verificar token primero
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Mostrar loading mientras se carga el usuario o la facility o se sincroniza
  if (authLoading || facilityLoading || syncingFacility) {
    return <LoadingSpinner fullScreen />;
  }

  // Si hay token pero no hay user, redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar platform admin si es requerido
  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/residents" replace />;
  }

  // Verificar rol OWNER si es requerido (legacy, usar requireRole en su lugar)
  if (requireOwner && !isOwner) {
    return <Navigate to="/residents" replace />;
  }

  // Verificar facility si es requerida
  if (requireFacility) {
    // Si es platform admin, puede acceder sin facility (no requiere facility)
    if (isPlatformAdmin) {
      return <>{children}</>;
    }
    
    // Si estamos en ruta /g/:id/*, verificar que el usuario tenga membership para ese id
    if (isGeriatricRoute && urlFacilityId) {
      const memberships = getMemberships();
      const hasMembership = memberships.some(m => m.facility_id === urlFacilityId && m.is_active);
      
      if (!hasMembership) {
        return <Navigate to="/select-facility" replace />;
      }
      
      // Si no hay activeFacilityId pero hay urlFacilityId válido, esperar a que se sincronice
      // Pero solo si no estamos sincronizando ya (para evitar loops)
      if (!activeFacilityId && syncingFacility === false && hasMembership) {
        // Dar un pequeño timeout antes de mostrar loading para evitar flashes
        return <LoadingSpinner fullScreen />;
      }
    } else if (!facility && !activeFacilityId) {
      // Si no es platform admin y no tiene facility, redirigir a selector
      // Pero solo si ya terminó de cargar (para evitar redirecciones prematuras)
      if (!authLoading && !facilityLoading) {
        return <Navigate to="/select-facility" replace />;
      }
    }
  }

  // Verificar rol en facility activa si es requerido
  if (requireRole && !isPlatformAdmin) {
    // Si estamos en ruta /g/:id/*, verificar rol del membership de ese id
    let roleToCheck: 'ADMIN' | 'MEDICO' | 'STAFF' | null = null;
    
    if (isGeriatricRoute && urlFacilityId) {
      const memberships = getMemberships();
      const membership = memberships.find(m => m.facility_id === urlFacilityId && m.is_active);
      roleToCheck = membership?.role ?? null;
    } else {
      roleToCheck = getActiveRole();
    }
    
    if (roleToCheck !== requireRole) {
      // Redirigir según el rol actual o a una página por defecto
      const currentFacilityId = urlFacilityId ?? activeFacilityId ?? user.active_facility_id;
      if (currentFacilityId) {
        if (roleToCheck === 'ADMIN') {
          return <Navigate to={`/g/${currentFacilityId}/dashboard`} replace />;
        } else if (roleToCheck === 'MEDICO') {
          return <Navigate to={`/g/${currentFacilityId}/medical`} replace />;
        } else if (roleToCheck === 'STAFF') {
          return <Navigate to={`/g/${currentFacilityId}/tasks`} replace />;
        }
      }
      return <Navigate to="/select-facility" replace />;
    }
  }

  return <>{children}</>;
};
