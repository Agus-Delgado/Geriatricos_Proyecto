import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFacility } from '../../contexts/FacilityContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
  requireFacility?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOwner = false,
  requireFacility = true,
}) => {
  const { user, token, loading: authLoading, isOwner } = useAuth();
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

  // Verificar rol OWNER si es requerido
  if (requireOwner && !isOwner) {
    return <Navigate to="/residents" replace />;
  }

  // Verificar facility si es requerida
  if (requireFacility && !facility) {
    return <Navigate to="/select-facility" replace />;
  }

  return <>{children}</>;
};
