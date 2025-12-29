import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User, FacilityMembership } from '../types/auth';
import type { ApiError } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  activeFacilityId: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setActiveFacility: (facilityId: string) => Promise<void>;
  clearActiveFacility: () => void;
  isOwner: boolean;
  isDoctor: boolean;
  isPlatformAdmin: boolean;
  getMemberships: () => FacilityMembership[];
  getActiveMembership: () => FacilityMembership | null;
  getActiveRole: () => 'ADMIN' | 'MEDICO' | 'STAFF' | null;
  // Impersonation
  isImpersonating: boolean;
  impersonatedUser: User | null;
  startImpersonation: (userId: string, mode?: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
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
  const [activeFacilityId, setActiveFacilityId] = useState<string | null>(null);
  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);

  useEffect(() => {
    // Cargar token y activeFacilityId del localStorage al iniciar
    const storedToken = localStorage.getItem('token');
    const storedFacilityId = localStorage.getItem('activeFacilityId');
    const storedOriginalToken = localStorage.getItem('original_token');
    
    if (storedFacilityId) {
      setActiveFacilityId(storedFacilityId);
    }
    
    if (storedToken) {
      setToken(storedToken);
      // Si hay original_token, estamos en modo impersonación
      if (storedOriginalToken) {
        setIsImpersonating(true);
      }
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
      
      // Sincronizar activeFacilityId: priorizar user.active_facility_id, luego localStorage
      const storedFacilityId = localStorage.getItem('activeFacilityId');
      const facilityIdToUse = userData.active_facility_id ?? storedFacilityId ?? null;
      
      if (facilityIdToUse) {
        setActiveFacilityId(facilityIdToUse);
        localStorage.setItem('activeFacilityId', facilityIdToUse);
      }
    } catch (error) {
      // Token inválido, limpiar
      localStorage.removeItem('token');
      localStorage.removeItem('activeFacilityId');
      setToken(null);
      setUser(null);
      setActiveFacilityId(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      // Normalizar identificador: eliminar espacios al inicio y final
      // NO hacer trim del password (puede tener espacios intencionales)
      const normalizedUsername = username.trim();
      const response = await authApi.login({ username: normalizedUsername, password });
      const authToken = response.access_token;
      
      localStorage.setItem('token', authToken);
      setToken(authToken);
      
      // Cargar datos del usuario (incluye memberships y active_facility_id)
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      
      // Sincronizar activeFacilityId: priorizar user.active_facility_id, luego localStorage
      const storedFacilityId = localStorage.getItem('activeFacilityId');
      const facilityIdToUse = userData.active_facility_id ?? storedFacilityId ?? null;
      
      if (facilityIdToUse) {
        setActiveFacilityId(facilityIdToUse);
        localStorage.setItem('activeFacilityId', facilityIdToUse);
      }
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.detail || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('original_token');
    localStorage.removeItem('facility_id');
    localStorage.removeItem('activeFacilityId');
    setToken(null);
    setUser(null);
    setActiveFacilityId(null);
    setIsImpersonating(false);
    setImpersonatedUser(null);
  };

  const loadUser = async () => {
    if (token) {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        
        // Sincronizar activeFacilityId: priorizar user.active_facility_id, luego localStorage
        const storedFacilityId = localStorage.getItem('activeFacilityId');
        const facilityIdToUse = userData.active_facility_id ?? storedFacilityId ?? null;
        
        if (facilityIdToUse) {
          setActiveFacilityId(facilityIdToUse);
          localStorage.setItem('activeFacilityId', facilityIdToUse);
        }
      } catch (error) {
        logout();
      }
    }
  };

  const clearActiveFacility = () => {
    setActiveFacilityId(null);
    localStorage.removeItem('activeFacilityId');
  };

  const setActiveFacility = async (facilityId: string) => {
    const prevFacilityId = activeFacilityId;
    
    try {
      // Actualización optimista: setear estado INMEDIATAMENTE
      setActiveFacilityId(facilityId);
      localStorage.setItem('activeFacilityId', facilityId);
      
      // Llamar al backend
      await authApi.setActiveFacility({ facility_id: facilityId });
      
      // Actualizar user con el nuevo active_facility_id
      setUser(prev => prev ? ({ ...prev, active_facility_id: facilityId }) : prev);
    } catch (error) {
      // Revertir en caso de error
      setActiveFacilityId(prevFacilityId);
      if (prevFacilityId) {
        localStorage.setItem('activeFacilityId', prevFacilityId);
      } else {
        localStorage.removeItem('activeFacilityId');
      }
      
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
    const facilityId = activeFacilityId ?? user?.active_facility_id ?? null;
    if (!facilityId || !user) return null;
    return user.memberships.find(m => m.facility_id === facilityId && m.is_active) ?? null;
  };

  const getActiveRole = (): 'ADMIN' | 'MEDICO' | 'STAFF' | null => {
    const activeMembership = getActiveMembership();
    return activeMembership?.role ?? null;
  };

  const startImpersonation = async (userId: string, mode?: string) => {
    try {
      // Guardar token original si no hay uno guardado
      const currentToken = localStorage.getItem('token');
      if (currentToken && !localStorage.getItem('original_token')) {
        localStorage.setItem('original_token', currentToken);
      }

      // Iniciar impersonación
      const response = await authApi.impersonateUser({ user_id: userId, mode });
      const impersonationToken = response.impersonation_token;

      // Guardar token de impersonación
      localStorage.setItem('token', impersonationToken);
      setToken(impersonationToken);
      setIsImpersonating(true);

      // Cargar datos del usuario impersonado
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setImpersonatedUser(userData);

      // Sincronizar activeFacilityId
      const facilityIdToUse = userData.active_facility_id ?? null;
      if (facilityIdToUse) {
        setActiveFacilityId(facilityIdToUse);
        localStorage.setItem('activeFacilityId', facilityIdToUse);
      }
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.detail || 'Error al iniciar impersonación');
    }
  };

  const stopImpersonation = async () => {
    try {
      // Detener impersonación en backend
      await authApi.stopImpersonation();

      // Restaurar token original
      const originalToken = localStorage.getItem('original_token');
      if (originalToken) {
        localStorage.setItem('token', originalToken);
        setToken(originalToken);
        localStorage.removeItem('original_token');
      } else {
        // Si no hay token original, hacer logout
        logout();
        return;
      }

      setIsImpersonating(false);
      setImpersonatedUser(null);

      // Cargar datos del admin original
      const userData = await authApi.getCurrentUser();
      setUser(userData);

      // Limpiar facility activa (admin no necesita facility)
      setActiveFacilityId(null);
      localStorage.removeItem('activeFacilityId');
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.detail || 'Error al detener impersonación');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeFacilityId,
        login,
        logout,
        loadUser,
        setActiveFacility,
        clearActiveFacility,
        isOwner,
        isDoctor,
        isPlatformAdmin,
        getMemberships,
        getActiveMembership,
        getActiveRole,
        isImpersonating,
        impersonatedUser,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
