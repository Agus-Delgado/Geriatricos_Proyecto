import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFacility } from '../contexts/FacilityContext';
import { facilitiesApi } from '../api/facilities';
import { getGeriatricBySlug } from '../config/geriatrics';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const GeriatricLoginPage: React.FC = () => {
  const { geriatricSlug } = useParams<{ geriatricSlug: string }>();
  const geriatric = geriatricSlug ? getGeriatricBySlug(geriatricSlug) : null;
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { setFacility } = useFacility();

  // Si no hay geriátrico válido, redirigir al selector
  if (!geriatric) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password, geriatric.slug);
      
      // Cargar facility por slug después del login
      try {
        const facility = await facilitiesApi.getBySlug(geriatric.slug);
        setFacility(facility);
      } catch (facilityError) {
        console.error('Error al cargar facility:', facilityError);
        // Continuar aunque falle, el usuario puede seleccionar después
      }
      
      navigate('/residents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const gradientStyle = {
    background: `linear-gradient(135deg, ${geriatric.theme.gradientFrom}, ${geriatric.theme.gradientTo})`,
  };

  const buttonGradientStyle = {
    background: `linear-gradient(135deg, ${geriatric.theme.buttonGradientFrom}, ${geriatric.theme.buttonGradientTo})`,
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={gradientStyle}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {geriatric.displayName}
            </h1>
            <p className="text-gray-600 text-sm">Acceso al sistema</p>
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
              style={buttonGradientStyle}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </span>
              ) : (
                'Identificarse'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              Acceso gestionado por administradores
            </p>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors underline"
              type="button"
            >
              ← Volver a selección de geriátrico
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
