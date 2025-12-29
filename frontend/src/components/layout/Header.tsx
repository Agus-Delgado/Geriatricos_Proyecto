import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRoleLabel } from '../../types/auth';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const { user, logout, setActiveFacility, getMemberships, getActiveMembership, getActiveRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showFacilitySwitcher, setShowFacilitySwitcher] = useState(false);
  const [loadingFacilitySwitch, setLoadingFacilitySwitch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const memberships = getMemberships();
  const activeMembership = getActiveMembership();
  const activeFacilityId = user?.active_facility_id ?? null;
  
  // Detectar si estamos en una ruta /g/* para mostrar botón "Volver"
  const isGeriatricRoute = location.pathname.startsWith('/g/');

  // Cerrar menú de usuario al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleFacilitySwitcherClick = () => {
    setShowFacilitySwitcher(!showFacilitySwitcher);
  };

  const handleSelectFacility = async (facilityId: string) => {
    try {
      setLoadingFacilitySwitch(true);
      await setActiveFacility(facilityId);
      setShowFacilitySwitcher(false);
      // Recargar la página actual para reflejar el cambio
      window.location.reload();
    } catch (error) {
      console.error('Error al cambiar facility:', error);
      setLoadingFacilitySwitch(false);
    }
  };

  const handleChangeFacility = () => {
    navigate('/select-facility');
  };

  const handleBack = () => {
    // Lógica robusta: si hay historial suficiente, volver atrás, sino ir a selector
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/select-facility');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Sección izquierda: Botón Volver (si aplica) + Título + Facility */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Botón Volver para rutas /g/* o si showBack está activo */}
            {(showBack || isGeriatricRoute) && (
              <button
                onClick={handleBack}
                className="flex-shrink-0 text-gray-600 hover:text-gray-800 transition-colors"
                aria-label="Volver"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <div className="flex-1 min-w-0">
              {title && <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>}
              <div className="relative">
                <button
                  onClick={handleFacilitySwitcherClick}
                  className="text-sm font-medium flex items-center transition-colors"
                  style={{
                    color: activeMembership ? 'var(--facility-accent)' : '#6b7280',
                  }}
                  disabled={memberships.length === 0}
                >
                  {activeMembership ? (
                    <span className="font-semibold truncate">{activeMembership.facility_name}</span>
                  ) : (
                    'Seleccionar geriátrico'
                  )}
                  {memberships.length > 1 && (
                    <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {showFacilitySwitcher && memberships.length > 1 && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    {loadingFacilitySwitch ? (
                      <div className="p-4 text-center text-sm text-gray-500">Cargando...</div>
                    ) : (
                      <div className="py-2">
                        {memberships.map((membership) => (
                          <button
                            key={membership.facility_id}
                            onClick={() => handleSelectFacility(membership.facility_id)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                              activeFacilityId === membership.facility_id ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span>{membership.facility_name}</span>
                              <span className="text-xs text-gray-500 ml-2">{getRoleLabel(membership.role)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sección derecha: Cambiar Hogar + Menú Usuario */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Botón "Cambiar Hogar" visible cuando hay múltiples memberships */}
            {user && memberships.length > 1 && (
              <button
                onClick={handleChangeFacility}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cambiar Hogar
              </button>
            )}
            
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Menú de usuario"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {user.full_name || user.email || user.dni || 'Usuario'}
                        </p>
                        {getActiveRole() && (
                          <p className="text-xs text-gray-500 mt-1">
                            {getRoleLabel(getActiveRole()!)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
