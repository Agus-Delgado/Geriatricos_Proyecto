import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User, FacilityMembership, UserRole } from '../types/auth';
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
  startImpersonation: (userId: string, mode?: UserRole) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

interface AuthProviderProps {
  children: ReactNode;
}

/** Timeout helper para evitar “loading infinito” si /auth/me queda colgado */
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

/** Map roles (CORRECTO): owner ≠ admin */
function mapRole(rawRole: unknown): UserRole | undefined {
  if (typeof rawRole !== 'string') return undefined;
  const normalized = rawRole.toLowerCase();

  switch (normalized) {
    case 'doctor':
    case 'medico':
      return 'doctor';
    case 'owner':
      return 'owner';
    case 'admin':
    case 'platform_admin':
      return 'admin';
    default:
      return undefined;
  }
}

/** Redirección defensiva para evitar bucles silenciosos */
function redirectToLogin(reason?: string) {
  const current = window.location.pathname;
  if (current.startsWith('/login')) return;
  const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  window.location.replace(`/login${qs}`);
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeFacilityId, setActiveFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Impersonation
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);

  const clearAllAuth = (opts?: { redirect?: boolean; reason?: string }) => {
    localStorage.removeItem('token');
    localStorage.removeItem('original_token');
    localStorage.removeItem('activeFacilityId');

    setToken(null);
    setUser(null);
    setActiveFacilityId(null);
    setIsImpersonating(false);
    setImpersonatedUser(null);

    if (opts?.redirect) redirectToLogin(opts.reason);
  };

  const syncActiveFacilityFromUser = (u: User) => {
    const stored = localStorage.getItem('activeFacilityId');
    const facilityIdToUse = u.active_facility_id ?? stored ?? null;

    if (facilityIdToUse) {
      setActiveFacilityId(facilityIdToUse);
      localStorage.setItem('activeFacilityId', facilityIdToUse);
      return;
    }

    // Platform admin puede no tener facility (válido)
    if (u.is_platform_admin) {
      setActiveFacilityId(null);
      localStorage.removeItem('activeFacilityId');
      return;
    }

    // Otros roles: si no hay facility activa, limpiamos
    setActiveFacilityId(null);
    localStorage.removeItem('activeFacilityId');
  };

  const loadUserWithToken = async (authToken: string) => {
    try {
      // Persistir token antes de pegarle al backend
      localStorage.setItem('token', authToken);
      setToken(authToken);

      // Timeout real (evita “cargando infinito”)
      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me');
      setUser(userData);

      // Impersonation detect
      const storedOriginalToken = localStorage.getItem('original_token');
      setIsImpersonating(Boolean(storedOriginalToken));

      syncActiveFacilityFromUser(userData);
    } catch (e) {
      const err = e as Partial<ApiError> & { message?: string };
      const msg = err?.message ?? '';

      // Si el backend cae o devuelve inválido, cortamos y redirigimos
      const reason =
        msg.startsWith('timeout:') ? 'server_timeout' :
        err?.status === 401 ? 'session_expired' :
        err?.status === 403 ? 'session_invalid' :
        err?.status === 500 ? 'server_error' :
        'auth_failed';

      clearAllAuth({ redirect: true, reason });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedFacilityId = localStorage.getItem('activeFacilityId');
    const storedOriginalToken = localStorage.getItem('original_token');

    if (storedFacilityId) setActiveFacilityId(storedFacilityId);
    if (storedOriginalToken) setIsImpersonating(true);

    if (storedToken) {
      // Rehidratar sesión
      void loadUserWithToken(storedToken);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const normalizedUsername = username.trim();
      const res = await withTimeout(authApi.login({ username: normalizedUsername, password }), 12000, 'auth_login');
      const authToken = res.access_token;

      localStorage.setItem('token', authToken);
      setToken(authToken);

      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me_after_login');
      setUser(userData);
      syncActiveFacilityFromUser(userData);
    } catch (e) {
      clearAllAuth();
      const err = e as Partial<ApiError> & { message?: string };
      throw new Error(err?.detail || err?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAllAuth({ redirect: true, reason: 'logout' });
  };

  const loadUser = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me_manual');
      setUser(userData);
      syncActiveFacilityFromUser(userData);
    } catch {
      clearAllAuth({ redirect: true, reason: 'session_expired' });
    } finally {
      setLoading(false);
    }
  };

  const clearActiveFacility = () => {
    setActiveFacilityId(null);
    localStorage.removeItem('activeFacilityId');
  };

  const setActiveFacility = async (facilityId: string) => {
    const prev = activeFacilityId;
    // optimista
    setActiveFacilityId(facilityId);
    localStorage.setItem('activeFacilityId', facilityId);

    try {
      await withTimeout(authApi.setActiveFacility({ facility_id: facilityId }), 12000, 'set_active_facility');
      setUser((u) => (u ? { ...u, active_facility_id: facilityId } : u));
    } catch (e) {
      // revertir
      setActiveFacilityId(prev ?? null);
      if (prev) localStorage.setItem('activeFacilityId', prev);
      else localStorage.removeItem('activeFacilityId');

      const err = e as Partial<ApiError> & { message?: string };
      throw new Error(err?.detail || err?.message || 'Error al establecer facility activa');
    }
  };

  // Flags de rol
  const isOwner = useMemo(() => user?.roles?.some((r) => r.code === 'OWNER') ?? false, [user]);
  const isDoctor = useMemo(() => user?.roles?.some((r) => r.code === 'DOCTOR') ?? false, [user]);
  const isPlatformAdmin = useMemo(() => user?.is_platform_admin ?? false, [user]);

  const getMemberships = (): FacilityMembership[] => user?.memberships?.filter((m) => m.is_active) ?? [];

  const getActiveMembership = (): FacilityMembership | null => {
    const facilityId = activeFacilityId ?? user?.active_facility_id ?? null;
    if (!facilityId || !user) return null;
    return user.memberships.find((m) => m.facility_id === facilityId && m.is_active) ?? null;
  };

  const getActiveRole = (): 'ADMIN' | 'MEDICO' | 'STAFF' | null => {
    return getActiveMembership()?.role ?? null;
  };

  const startImpersonation = async (userId: string, mode?: UserRole) => {
    setLoading(true);
    try {
      const currentToken = localStorage.getItem('token');
      if (currentToken && !localStorage.getItem('original_token')) {
        localStorage.setItem('original_token', currentToken);
      }

      const normalizedMode: UserRole | undefined = mode ? mapRole(mode) ?? mode : undefined;

      const res = await withTimeout(
        authApi.impersonateUser({ user_id: userId, mode: normalizedMode }),
        12000,
        'impersonate'
      );

      localStorage.setItem('token', res.impersonation_token);
      setToken(res.impersonation_token);
      setIsImpersonating(true);

      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me_after_impersonate');
      setUser(userData);
      setImpersonatedUser(userData);

      syncActiveFacilityFromUser(userData);
    } catch (e) {
      const err = e as Partial<ApiError> & { message?: string };
      throw new Error(err?.detail || err?.message || 'Error al iniciar impersonación');
    } finally {
      setLoading(false);
    }
  };

  const stopImpersonation = async () => {
    setLoading(true);
    try {
      await withTimeout(authApi.stopImpersonation(), 12000, 'stop_impersonate');

      const originalToken = localStorage.getItem('original_token');
      if (!originalToken) {
        clearAllAuth({ redirect: true, reason: 'impersonation_end' });
        return;
      }

      localStorage.setItem('token', originalToken);
      localStorage.removeItem('original_token');
      setToken(originalToken);

      setIsImpersonating(false);
      setImpersonatedUser(null);

      const userData = await withTimeout(authApi.getCurrentUser(), 12000, 'auth_me_after_stop_impersonate');
      setUser(userData);

      // Admin puede quedar sin facility
      syncActiveFacilityFromUser(userData);
    } catch (e) {
      const err = e as Partial<ApiError> & { message?: string };
      throw new Error(err?.detail || err?.message || 'Error al detener impersonación');
    } finally {
      setLoading(false);
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
