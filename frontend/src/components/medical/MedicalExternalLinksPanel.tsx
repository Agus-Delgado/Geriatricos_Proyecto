import React from 'react';
import { getConfiguredMedicalLinks } from '../../config/medicalLinks';

export const MedicalExternalLinksPanel: React.FC = () => {
  const validLinks = getConfiguredMedicalLinks();

  if (validLinks.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl border border-gray-200 shadow-lg p-4 md:p-6 mb-6"
      style={{ backgroundColor: 'var(--facility-card, white)' }}
    >
      <h2 className="text-lg font-semibold text-gray-900">Accesos médicos</h2>
      <p className="text-sm text-gray-600 mt-1 mb-4">Herramientas externas</p>
      <div className="flex flex-wrap gap-2">
        {validLinks.map((link) => (
          <a
            key={link.envVar}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">Abrir en nueva pestaña</p>
    </div>
  );
};
