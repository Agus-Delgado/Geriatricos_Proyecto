import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMedicalHubPath } from '../../utils/medicalNavigation';
import { ModuleUnavailablePage } from '../../pages/ModuleUnavailablePage';

interface LegacyModuleRedirectProps {
  moduleName?: string;
}

/**
 * En modo médico, muestra pantalla informativa para módulos legacy (finanzas, staff, etc.)
 * con opción de volver al inicio médico.
 */
export const LegacyModuleRedirect: React.FC<LegacyModuleRedirectProps> = ({
  moduleName = 'Este módulo',
}) => {
  const { activeFacilityId, user } = useAuth();
  const facilityId = activeFacilityId ?? user?.active_facility_id ?? null;

  if (facilityId) {
    return (
      <ModuleUnavailablePage
        title={`${moduleName} no disponible`}
        message="Esta función no forma parte de la aplicación médica."
        medicalHubPath={getMedicalHubPath(facilityId)}
      />
    );
  }

  return (
    <ModuleUnavailablePage
      title={`${moduleName} no disponible`}
      message="Seleccioná un hogar para continuar con la aplicación médica."
      showSelectFacility
    />
  );
};
