import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GERIATRICS } from '../config/geriatrics';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectGeriatric = (slug: string) => {
    navigate(`/login/${slug}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Geriátricos</h1>
          <p className="text-white/90">Selecciona tu geriátrico para continuar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GERIATRICS.map((geriatric) => (
            <button
              key={geriatric.slug}
              onClick={() => handleSelectGeriatric(geriatric.slug)}
              className="card hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${geriatric.theme.gradientFrom}15, ${geriatric.theme.gradientTo}15)`,
                borderColor: geriatric.theme.gradientFrom,
              }}
            >
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${geriatric.theme.gradientFrom}, ${geriatric.theme.gradientTo})`,
                  }}
                >
                  {geriatric.displayName.charAt(0)}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg">{geriatric.displayName}</h3>
                <p className="text-sm text-gray-600 mt-2">Haz clic para iniciar sesión</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
