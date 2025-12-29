import React from 'react';
import { Navigate } from 'react-router-dom';
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
  const { user, token, loading: authLoading, isOwner, isPlatformAdmin, getActiveRole } = useAuth();
  const { facility, loading: facilityLoading } = useFacility();

  // Verificar token primero
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Mostrar loading mientras se carga el usuario o la facility
  if (authLoading || facilityLoading) {
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
  if (requireFacility && !facility) {
    // Si es platform admin, puede acceder sin facility
    if (isPlatformAdmin) {
      return <>{children}</>;
    }
    return <Navigate to="/select-facility" replace />;
  }

  // Verificar rol en facility activa si es requerido
  if (requireRole && !isPlatformAdmin) {
    const activeRole = getActiveRole();
    if (activeRole !== requireRole) {
      // Redirigir según el rol actual o a una página por defecto
      if (activeRole === 'ADMIN') {
        return <Navigate to={`/g/${user.active_facility_id}/dashboard`} replace />;
      } else if (activeRole === 'MEDICO') {
        return <Navigate to={`/g/${user.active_facility_id}/medical`} replace />;
      } else if (activeRole === 'STAFF') {
        return <Navigate to={`/g/${user.active_facility_id}/tasks`} replace />;
      }
      return <Navigate to="/select-facility" replace />;
    }
  }

  return <>{children}</>;
};
