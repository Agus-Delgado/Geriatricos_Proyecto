import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User, FacilityMembership, UserRole } from '../types/auth';
import type { ApiError } from '../api/client';

// Type guard to validate user role
function isUserRole(v: unknown): v is UserRole {
  return v === 'doctor' || v === 'owner' || v === 'admin';
}

// Map role from API/storage to UserRole
function mapRole(rawRole: unknown): UserRole | undefined {
  if (typeof rawRole !== 'string') {
    return undefined;
  }
  
  // Normalize case
  const normalized = rawRole.toLowerCase();
  
  // Map API values to frontend types
  switch (normalized) {
    case 'doctor':
    case 'medico':
      return 'doctor';
    case 'owner':
    case 'admin':
    case 'platform_admin':
      return 'admin';
    default:
      return undefined;
  }
}

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
  startImpersonation: (userId: string, mode?: UserRole) => Promise<void>;
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
      // Asegurar que el token está en localStorage antes de hacer la llamada
      localStorage.setItem('token', authToken);
      
      // Logging para diagnóstico
      if (import.meta.env.DEV) {
        console.debug('[Auth] Rehidratando sesión con token del localStorage');
      }
      
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setToken(authToken);
      
      // Logging exitoso
      if (import.meta.env.DEV) {
        console.debug('[Auth] Sesión rehidratada exitosamente', {
          userId: userData.id,
          email: userData.email,
          is_platform_admin: userData.is_platform_admin,
        });
      }
      
      // Sincronizar activeFacilityId: priorizar user.active_facility_id, luego localStorage
      // Para platform admins, active_facility_id puede ser null y es válido
      const storedFacilityId = localStorage.getItem('activeFacilityId');
      const facilityIdToUse = userData.active_facility_id ?? storedFacilityId ?? null;
      
      if (facilityIdToUse) {
        setActiveFacilityId(facilityIdToUse);
        localStorage.setItem('activeFacilityId', facilityIdToUse);
      } else if (!userData.is_platform_admin) {
        // Si no es platform admin y no tiene facility, limpiar
        setActiveFacilityId(null);
        localStorage.removeItem('activeFacilityId');
      }
    } catch (error) {
      // Logging de error para diagnóstico
      const apiError = error as ApiError;
      const reason = apiError.status === 401 ? 'token_expired' : 
                     apiError.status === 403 ? 'token_invalid' : 
                     apiError.status === 500 ? 'server_error' :
                     'auth_rehydrate_failed';
      
      if (import.meta.env.DEV) {
        console.debug(`[Auth] Error al rehidratar sesión: ${reason}`, {
          status: apiError.status,
          detail: apiError.detail,
        });
      }
      
      // Token inválido, expirado o error del servidor: limpiar todo
      localStorage.removeItem('token');
      localStorage.removeItem('original_token');
      localStorage.removeItem('activeFacilityId');
      setToken(null);
      setUser(null);
      setActiveFacilityId(null);
      setIsImpersonating(false);
      setImpersonatedUser(null);
      
      // El error será manejado por el cliente API que redirigirá a login
      // No redirigir aquí para evitar múltiples redirecciones
    } finally {
      // SIEMPRE finalizar loading, incluso si hay error
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
      
      // Guardar token en localStorage inmediatamente
      localStorage.setItem('token', authToken);
      setToken(authToken);
      
      // Logging para diagnóstico
      if (import.meta.env.DEV) {
        console.debug('[Auth] Login exitoso, guardando token en localStorage');
      }
      
      // Cargar datos del usuario (incluye memberships y active_facility_id)
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      
      // Logging exitoso
      if (import.meta.env.DEV) {
        console.debug('[Auth] Usuario cargado después de login', {
          userId: userData.id,
          email: userData.email,
        });
      }
      
      // Sincronizar activeFacilityId: priorizar user.active_facility_id, luego localStorage
      // Para platform admins, active_facility_id puede ser null y es válido
      const storedFacilityId = localStorage.getItem('activeFacilityId');
      const facilityIdToUse = userData.active_facility_id ?? storedFacilityId ?? null;
      
      if (facilityIdToUse) {
        setActiveFacilityId(facilityIdToUse);
        localStorage.setItem('activeFacilityId', facilityIdToUse);
      } else if (!userData.is_platform_admin) {
        // Si no es platform admin y no tiene facility, limpiar
        setActiveFacilityId(null);
        localStorage.removeItem('activeFacilityId');
      }
    } catch (error) {
      // Limpiar token en caso de error para evitar estados inconsistentes
      localStorage.removeItem('token');
      localStorage.removeItem('original_token');
      setToken(null);
      setUser(null);
      setActiveFacilityId(null);
      
      const apiError = error as ApiError;
      
      // Logging de error
      if (import.meta.env.DEV) {
        console.debug('[Auth] Error en login', {
          status: apiError.status,
          detail: apiError.detail,
        });
      }
      
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

  const startImpersonation = async (userId: string, mode?: UserRole) => {
    try {
      // Guardar token original si no hay uno guardado
      const currentToken = localStorage.getItem('token');
      if (currentToken && !localStorage.getItem('original_token')) {
        localStorage.setItem('original_token', currentToken);
      }

      // Normalizar mode: validar y mapear si es necesario
      const normalizedMode: UserRole | undefined = mode !== undefined 
        ? (isUserRole(mode) ? mode : mapRole(mode))
        : undefined;

      // Iniciar impersonación
      const response = await authApi.impersonateUser({ 
        user_id: userId, 
        mode: normalizedMode 
      });
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
