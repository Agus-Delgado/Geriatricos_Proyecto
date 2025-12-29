import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User, FacilityMembership } from '../types/auth';
import type { ApiError } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setActiveFacility: (facilityId: string) => Promise<void>;
  isOwner: boolean;
  isDoctor: boolean;
  isPlatformAdmin: boolean;
  getMemberships: () => FacilityMembership[];
  getActiveMembership: () => FacilityMembership | null;
  getActiveRole: () => 'ADMIN' | 'MEDICO' | 'STAFF' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar token del localStorage al iniciar
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      // Intentar cargar usuario
      loadUserWithToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserWithToken = async (authToken: string) => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setToken(authToken);
    } catch (error) {
      // Token inválido, limpiar
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login({ username, password });
      const authToken = response.access_token;
      
      localStorage.setItem('token', authToken);
      setToken(authToken);
      
      // Cargar datos del usuario (incluye memberships y active_facility_id)
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      
      // Actualizar facility_id en localStorage si existe
      if (userData.active_facility_id) {
        localStorage.setItem('facility_id', userData.active_facility_id);
      }
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.detail || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('facility_id');
    setToken(null);
    setUser(null);
  };

  const loadUser = async () => {
    if (token) {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        
        // Actualizar facility_id en localStorage si existe
        if (userData.active_facility_id) {
          localStorage.setItem('facility_id', userData.active_facility_id);
        }
      } catch (error) {
        logout();
      }
    }
  };

  const setActiveFacility = async (facilityId: string) => {
    try {
      await authApi.setActiveFacility({ facility_id: facilityId });
      // Actualizar estado local INMEDIATAMENTE para que la navegación funcione sin delay
      setUser(prev => prev ? ({ ...prev, active_facility_id: facilityId }) : prev);
      localStorage.setItem('facility_id', facilityId);
      
      // Sincronizar con el backend en background (no bloquear)
      // Esto asegura que el estado local esté actualizado antes de navegar
      setTimeout(() => {
        loadUser().catch(() => {
          // Si falla, el estado local ya está actualizado, así que no es crítico
        });
      }, 0);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.detail || 'Error al establecer facility activa');
    }
  };

  const isOwner = user?.roles.some((role) => role.code === 'OWNER') ?? false;
  const isDoctor = user?.roles.some((role) => role.code === 'DOCTOR') ?? false;
  const isPlatformAdmin = user?.is_platform_admin ?? false;

  const getMemberships = (): FacilityMembership[] => {
    return user?.memberships.filter(m => m.is_active) ?? [];
  };

  const getActiveMembership = (): FacilityMembership | null => {
    if (!user?.active_facility_id) return null;
    return user.memberships.find(m => m.facility_id === user.active_facility_id && m.is_active) ?? null;
  };

  const getActiveRole = (): 'ADMIN' | 'MEDICO' | 'STAFF' | null => {
    const activeMembership = getActiveMembership();
    return activeMembership?.role ?? null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        loadUser,
        setActiveFacility,
        isOwner,
        isDoctor,
        isPlatformAdmin,
        getMemberships,
        getActiveMembership,
        getActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
