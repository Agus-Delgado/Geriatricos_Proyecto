import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types/auth';
import type { ApiError } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string, facilitySlug?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  isOwner: boolean;
  isDoctor: boolean;
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

  const login = async (username: string, password: string, facilitySlug?: string) => {
    try {
      const response = await authApi.login({ username, password, facility_slug: facilitySlug });
      const authToken = response.access_token;
      
      localStorage.setItem('token', authToken);
      setToken(authToken);
      
      // Cargar datos del usuario
      const userData = await authApi.getCurrentUser();
      setUser(userData);
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
      } catch (error) {
        logout();
      }
    }
  };

  const isOwner = user?.roles.some((role) => role.code === 'OWNER') ?? false;
  const isDoctor = user?.roles.some((role) => role.code === 'DOCTOR') ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        loadUser,
        isOwner,
        isDoctor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
