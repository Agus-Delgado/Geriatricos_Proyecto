import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFacility } from '../../contexts/FacilityContext';
import { useNavigate } from 'react-router-dom';
import { facilitiesApi } from '../../api/facilities';
import type { Facility } from '../../types/auth';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const { user, logout } = useAuth();
  const { facility, setFacility } = useFacility();
  const navigate = useNavigate();
  const [showFacilitySwitcher, setShowFacilitySwitcher] = useState(false);
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFacilitySwitcherClick = async () => {
    if (!showFacilitySwitcher && user?.facilities) {
      setLoadingFacilities(true);
      try {
        // Cargar todas las facilities del usuario
        const facilities = await facilitiesApi.list();
        setAvailableFacilities(facilities);
      } catch (error) {
        console.error('Error al cargar facilities:', error);
      } finally {
        setLoadingFacilities(false);
      }
    }
    setShowFacilitySwitcher(!showFacilitySwitcher);
  };

  const handleSelectFacility = (newFacility: Facility) => {
    setFacility(newFacility);
    setShowFacilitySwitcher(false);
    // Recargar la página actual para reflejar el cambio
    window.location.reload();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 py-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
            {facility && (
              <div className="relative">
                <button
                  onClick={handleFacilitySwitcherClick}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                >
                  {facility.name}
                  {user && user.facilities && user.facilities.length > 1 && (
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {showFacilitySwitcher && user && user.facilities && user.facilities.length > 1 && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    {loadingFacilities ? (
                      <div className="p-4 text-center text-sm text-gray-500">Cargando...</div>
                    ) : (
                      <div className="py-2">
                        {availableFacilities.map((fac) => (
                          <button
                            key={fac.id}
                            onClick={() => handleSelectFacility(fac)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                              facility?.id === fac.id ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                            }`}
                          >
                            {fac.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {user && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
