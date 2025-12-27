import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFacility } from '../contexts/FacilityContext';
import { facilitiesApi } from '../api/facilities';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import type { Facility } from '../types/auth';
import type { ApiError } from '../api/client';

export const SelectFacilityPage: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { setFacility } = useFacility();
  const navigate = useNavigate();

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      setLoading(true);
      const data = await facilitiesApi.list();
      setFacilities(data);
      
      // Si solo hay una facility, seleccionarla automáticamente
      if (data.length === 1) {
        handleSelectFacility(data[0]);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar sedes');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFacility = (facility: Facility) => {
    setFacility(facility);
    navigate('/residents');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <ErrorMessage message={error} />
          <Button onClick={loadFacilities} className="mt-4" fullWidth>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Seleccionar Sede
          </h1>
          <p className="text-gray-600">
            {user?.full_name}, elige la sede con la que trabajarás
          </p>
        </div>

        <div className="space-y-3">
          {facilities.map((facility) => (
            <button
              key={facility.id}
              onClick={() => handleSelectFacility(facility)}
              className="card w-full text-left hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-900">{facility.name}</h3>
              <p className="text-sm text-gray-500 mt-1">Código: {facility.code}</p>
            </button>
          ))}
        </div>

        {facilities.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            No tienes acceso a ninguna sede
          </div>
        )}
      </div>
    </div>
  );
};
