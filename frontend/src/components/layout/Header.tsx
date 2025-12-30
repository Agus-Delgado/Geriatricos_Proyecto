import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRoleLabel } from '../../types/auth';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const { user, logout, getMemberships, getActiveMembership, getActiveRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const memberships = getMemberships();
  const activeMembership = getActiveMembership();
  
  // Detectar si estamos en una ruta /g/* para mostrar botón "Volver"
  const isGeriatricRoute = location.pathname.startsWith('/g/');
  
  // Detectar rutas médicas que necesitan botón volver
  const isMedicalRoute = 
    location.pathname.startsWith('/medical-folder') ||
    location.pathname.startsWith('/clinical-history') ||
    location.pathname.startsWith('/prescriptions-history');
  
  // Detectar si estamos en una ruta interna (no login, no select-facility)
  const isInternalRoute = !location.pathname.startsWith('/login') && location.pathname !== '/select-facility';
  
  // Determinar si debemos mostrar botón volver
  const shouldShowBack = showBack || isGeriatricRoute || isMedicalRoute;

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

  const handleChangeFacility = () => {
    navigate('/select-facility');
  };

  const handleBack = () => {
    // Lógica robusta: determinar fallback según la ruta actual
    let fallbackPath = '/select-facility';
    
    if (isMedicalRoute) {
      // Para rutas médicas, volver al dashboard médico si hay facility activa
      if (activeMembership?.facility_id) {
        fallbackPath = `/g/${activeMembership.facility_id}/medical`;
      } else {
        fallbackPath = '/select-facility';
      }
    } else if (isGeriatricRoute) {
      // Para rutas geriátricas, intentar volver al dashboard correspondiente
      const facilityId = location.pathname.match(/\/g\/([^/]+)/)?.[1];
      if (facilityId) {
        const role = getActiveRole();
        if (role === 'ADMIN') fallbackPath = `/g/${facilityId}/dashboard`;
        else if (role === 'MEDICO') fallbackPath = `/g/${facilityId}/medical`;
        else if (role === 'STAFF') fallbackPath = `/g/${facilityId}/tasks`;
        else fallbackPath = `/g/${facilityId}/dashboard`;
      }
    }
    
    // Si hay historial suficiente, volver atrás, sino usar fallback
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  // Solo mostrar header en rutas internas
  if (!isInternalRoute) {
    return null;
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Sección izquierda: Botón Volver (si aplica) + Título + Facility */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Botón Volver para rutas /g/*, rutas médicas o si showBack está activo */}
            {shouldShowBack && (
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
              {activeMembership && (
                <p className="text-sm text-gray-600 truncate" style={{ color: 'var(--facility-accent)' }}>
                  {activeMembership.facility_name}
                </p>
              )}
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
