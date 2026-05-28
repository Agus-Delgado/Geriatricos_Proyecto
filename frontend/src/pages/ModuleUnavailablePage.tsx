import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

interface ModuleUnavailablePageProps {
  title?: string;
  message?: string;
  showSelectFacility?: boolean;
}

export const ModuleUnavailablePage: React.FC<ModuleUnavailablePageProps> = ({
  title = 'Módulo no disponible',
  message = 'Esta función no está disponible en la aplicación médica.',
  showSelectFacility = false,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pb-20">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="text-gray-600 text-sm">{message}</p>
        <div className="flex flex-col gap-2 pt-2">
          {showSelectFacility && (
            <Button onClick={() => navigate('/select-facility')}>Elegir sede</Button>
          )}
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Volver
          </Button>
        </div>
      </div>
    </div>
  );
};
