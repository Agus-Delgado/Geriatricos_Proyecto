import React from 'react';
import { MEDICAL_LINKS } from '../../config/medicalLinks';
import { openExternal } from '../../utils/externalLinks';

export const MedicalExternalLinksPanel: React.FC = () => {
  const validLinks = MEDICAL_LINKS.filter((link) => link.isValid);

  if (validLinks.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white/90 p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Enlaces externos</h2>
        <p className="text-sm text-gray-600">
          Configurá VITE_MISRX_URL, VITE_RECETO_URL o VITE_PAMI_URL en el build para mostrar
          accesos rápidos a recetas electrónicas.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white/90 p-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Enlaces externos</h2>
      <div className="flex flex-wrap gap-2">
        {validLinks.map((link) => (
          <button
            key={link.envVar}
            type="button"
            onClick={() => openExternal(link.url)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
};
