import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFacility } from '../contexts/FacilityContext';
import { residentsApi } from '../api/residents';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { SearchBar } from '../components/ui/SearchBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import { ResidentForm } from '../components/forms/ResidentForm';
import type { Resident } from '../types/residents';
import type { ApiError } from '../api/client';

export const ResidentsListPage: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stayStatusFilter, setStayStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { facility } = useFacility();
  const navigate = useNavigate();

  useEffect(() => {
    if (facility) {
      loadResidents();
    }
  }, [facility, searchQuery, stayStatusFilter]);

  const loadResidents = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);
      const data = await residentsApi.list(facility.id, {
        q: searchQuery || undefined,
        stay_status: stayStatusFilter || undefined,
      });
      setResidents(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar residentes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResident = async (data: any) => {
    try {
      await residentsApi.create(data);
      setShowCreateModal(false);
      loadResidents();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear residente');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Residentes" />
      
      <div className="px-4 py-4 space-y-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por nombre o DNI..."
            />
          </div>
        </div>

        <div>
          <select
            value={stayStatusFilter}
            onChange={(e) => setStayStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="ENDED">Finalizados</option>
          </select>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : residents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery || stayStatusFilter
              ? 'No se encontraron residentes'
              : 'No hay residentes registrados'}
          </div>
        ) : (
          <div className="space-y-3">
            {residents.map((resident) => (
              <button
                key={resident.id}
                onClick={() => navigate(`/residents/${resident.id}`)}
                className="card w-full text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {resident.first_name} {resident.last_name}
                    </h3>
                    {resident.dni && (
                      <p className="text-sm text-gray-500 mt-1">DNI: {resident.dni}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Ingreso: {formatDate(resident.admission_date)}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                        resident.stay_status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {resident.stay_status === 'ACTIVE' ? 'Activo' : 'Finalizado'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {facility && (
          <div className="fixed bottom-24 right-4 z-30">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo Residente"
        size="lg"
      >
        {facility && (
          <ResidentForm
            onSubmit={handleCreateResident}
            onCancel={() => setShowCreateModal(false)}
            facilityId={facility.id}
          />
        )}
      </Modal>

      <BottomNav />
    </div>
  );
};
