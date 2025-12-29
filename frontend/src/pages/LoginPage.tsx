import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, user, token } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya está autenticado, redirigir según rol/memberships
  useEffect(() => {
    if (token && user) {
      redirectAfterLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const redirectAfterLogin = () => {
    if (!user) return;

    // Platform admin -> /platform
    if (user.is_platform_admin) {
      navigate('/platform', { replace: true });
      return;
    }

    const memberships = user.memberships.filter(m => m.is_active);

    // Sin memberships -> error (no debería pasar)
    if (memberships.length === 0) {
      setError('Usuario sin acceso asignado');
      return;
    }

    // Si hay active_facility_id, redirigir según rol en esa facility
    if (user.active_facility_id) {
      const activeMembership = memberships.find(m => m.facility_id === user.active_facility_id);
      if (activeMembership) {
        redirectByRole(activeMembership.role, user.active_facility_id);
        return;
      }
    }

    // Si solo hay una membership, setearla automáticamente y redirigir
    if (memberships.length === 1) {
      // El backend debería setearla automáticamente, pero por si acaso
      // aquí simplemente redirigimos al selector que la seteará
      navigate('/select-facility', { replace: true });
      return;
    }

    // Múltiples memberships -> selector
    if (memberships.length > 1) {
      navigate('/select-facility', { replace: true });
      return;
    }
  };

  const redirectByRole = (role: 'ADMIN' | 'MEDICO' | 'STAFF', facilityId: string) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      // redirectAfterLogin se ejecutará en el useEffect cuando user se actualice
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  // Fondo con imagen ilustrada o fallback a gradient violeta
  const fallbackGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  const [imageError, setImageError] = useState(false);

  const backgroundStyle: React.CSSProperties = imageError
    ? { background: fallbackGradient }
    : {
        backgroundImage: 'url(/backgrounds/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#667eea', // Fallback color si la imagen no carga
      };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative"
      style={backgroundStyle}
    >
      {/* Overlay suave para mejorar legibilidad (solo si hay imagen) */}
      {!imageError && (
        <div 
          className="absolute inset-0"
          style={{ background: 'rgba(102, 126, 234, 0.1)' }}
        />
      )}
      
      {/* Imagen oculta para detectar error */}
      <img
        src="/backgrounds/login-bg.png"
        alt=""
        className="hidden"
        onError={() => setImageError(true)}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Hogares de Cuidado y Cariño
            </h1>
            <p className="text-gray-600 text-sm">Acceso gestionado por administradores</p>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="DNI o Usuario"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              disabled={loading}
              className="w-full"
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              className="w-full"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              Acceso gestionado por administradores
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
