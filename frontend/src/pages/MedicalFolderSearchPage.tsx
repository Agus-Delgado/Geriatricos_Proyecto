import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PatientSearchSelect } from '../components/patients/PatientSearchSelect';
import { BackHeader } from '../components/ui/BackHeader';
import { MedicalPageShell } from '../components/layout/MedicalPageShell';
import { isMedicalAppMode } from '../config/appMode';
import { getMedicalHubPath } from '../utils/medicalNavigation';
import type { Resident } from '../types/residents';

export default function MedicalFolderSearchPage() {
  const navigate = useNavigate();
  const { activeFacilityId } = useAuth();

  const handleSelectPatient = (patient: Resident) => {
    navigate(`/medical-folder/${patient.id}`);
  };

  const getFallbackPath = () => {
    if (activeFacilityId && isMedicalAppMode()) {
      return getMedicalHubPath(activeFacilityId);
    }
    return '/select-facility';
  };

  return (
    <MedicalPageShell>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <BackHeader title="Carpeta Médica" fallbackPath={getFallbackPath()} />
        <div className="rounded-xl shadow-lg p-6 mb-6 bg-white/95 border border-white/80">
          <p className="text-gray-600 mb-6">
            Busque un paciente para ver su carpeta médica con evoluciones, indicaciones y
            constancias.
          </p>
          <PatientSearchSelect onSelect={handleSelectPatient} />
        </div>
      </div>
    </MedicalPageShell>
  );
}
