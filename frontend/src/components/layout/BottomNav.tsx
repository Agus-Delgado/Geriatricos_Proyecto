import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isMedicalAppMode } from '../../config/appMode';

const homeIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const patientsIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2h5m16 0v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2m16 0H9m-7 0h7"
    />
  </svg>
);

const clinicalIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const certsIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
    />
  </svg>
);

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { isOwner, isDoctor, activeFacilityId } = useAuth();
  const medicalMode = isMedicalAppMode();
  const hubPath = activeFacilityId ? `/g/${activeFacilityId}/medical` : '/select-facility';
  const certsPath = activeFacilityId ? `/g/${activeFacilityId}/certificates` : '/select-facility';

  const navItems = medicalMode
    ? [
        { path: hubPath, label: 'Inicio', icon: homeIcon, match: (p: string) => p.includes('/medical') },
        {
          path: '/residents',
          label: 'Pacientes',
          icon: patientsIcon,
          match: (p: string) => p.startsWith('/residents') && !p.includes('/trash'),
        },
        {
          path: '/clinical-history/search',
          label: 'Historia',
          icon: clinicalIcon,
          match: (p: string) => p.startsWith('/clinical-history'),
        },
        {
          path: certsPath,
          label: 'Certificados',
          icon: certsIcon,
          match: (p: string) => p.includes('/certificates'),
        },
      ]
    : [
        {
          path: '/residents',
          label: 'Residentes',
          icon: patientsIcon,
          match: (p: string) => p.startsWith('/residents'),
        },
        {
          path: '/medical-guide',
          label: 'Guía médica',
          icon: clinicalIcon,
          match: (p: string) => p.startsWith('/medical-guide'),
        },
        ...((isOwner || isDoctor)
          ? [
              {
                path: '/activity',
                label: 'Noticias',
                icon: clinicalIcon,
                match: (p: string) => p.startsWith('/activity'),
              },
            ]
          : []),
        ...(isOwner
          ? [
              {
                path: '/finance',
                label: 'Finanzas',
                icon: homeIcon,
                match: (p: string) => p.startsWith('/finance'),
              },
              {
                path: '/staff',
                label: 'Personal',
                icon: patientsIcon,
                match: (p: string) => p.startsWith('/staff'),
              },
              {
                path: '/attendance',
                label: 'Asistencia',
                icon: clinicalIcon,
                match: (p: string) => p.startsWith('/attendance'),
              },
            ]
          : []),
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = item.match(location.pathname);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
