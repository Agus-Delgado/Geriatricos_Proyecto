import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { getRoleLabel } from '../types/auth';

export const SelectFacilityPage: React.FC = () => {
  const { user, setActiveFacility, getMemberships, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleSelectFacility = async (facilityId: string, role: 'ADMIN' | 'MEDICO' | 'STAFF') => {
    try {
      await setActiveFacility(facilityId);
      
      // Redirigir según rol
      switch (role) {
        case 'ADMIN':
          navigate(`/g/${facilityId}/dashboard`, { replace: true });
          break;
        case 'MEDICO':
          navigate(`/g/${facilityId}/medical`, { replace: true });
          break;
        case 'STAFF':
          navigate(`/g/${facilityId}/tasks`, { replace: true });
          break;
      }
    } catch (error) {
      console.error('Error al establecer facility activa:', error);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const memberships = getMemberships();

  // Si solo hay una membership, seleccionarla automáticamente
  useEffect(() => {
    if (memberships.length === 1 && !user?.active_facility_id) {
      const membership = memberships[0];
      handleSelectFacility(membership.facility_id, membership.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships.length, user?.active_facility_id]);

  if (memberships.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <ErrorMessage message="No tienes acceso a ninguna sede" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Seleccionar Geriátrico
          </h1>
          <p className="text-gray-600">
            {user.full_name}, elige el geriátrico con el que trabajarás
          </p>
        </div>

        <div className="space-y-3">
          {memberships.map((membership) => (
            <button
              key={membership.id}
              onClick={() => handleSelectFacility(membership.facility_id, membership.role)}
              className="card w-full text-left hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{membership.facility_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Código: {membership.facility_code}</p>
                </div>
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {getRoleLabel(membership.role)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
