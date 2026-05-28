import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMedicalHubPath } from '../../utils/medicalNavigation';
import { ModuleUnavailablePage } from '../../pages/ModuleUnavailablePage';

interface LegacyModuleRedirectProps {
  moduleName?: string;
}

/**
 * En modo médico, redirige módulos legacy (finanzas, staff, etc.) al hub médico
 * o muestra pantalla informativa si no hay sede activa.
 */
export const LegacyModuleRedirect: React.FC<LegacyModuleRedirectProps> = ({
  moduleName = 'Este módulo',
}) => {
  const { activeFacilityId, user } = useAuth();
  const facilityId = activeFacilityId ?? user?.active_facility_id ?? null;

  if (facilityId) {
    return <Navigate to={getMedicalHubPath(facilityId)} replace />;
  }

  return (
    <ModuleUnavailablePage
      title={`${moduleName} no disponible`}
      message="Seleccioná una sede para continuar con la aplicación médica."
      showSelectFacility
    />
  );
};
