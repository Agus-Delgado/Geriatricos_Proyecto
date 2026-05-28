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

const medsIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
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

const accountIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
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
        {
          path: hubPath,
          label: 'Inicio médico',
          shortLabel: 'Inicio',
          icon: homeIcon,
          match: (p: string) => p.includes('/medical'),
        },
        {
          path: '/residents',
          label: 'Pacientes',
          shortLabel: 'Pacientes',
          icon: patientsIcon,
          match: (p: string) => p.startsWith('/residents') && !p.includes('/trash'),
        },
        {
          path: '/clinical-history/search',
          label: 'Historia clínica',
          shortLabel: 'Historia',
          icon: clinicalIcon,
          match: (p: string) => p.startsWith('/clinical-history'),
        },
        {
          path: '/prescriptions-history/search',
          label: 'Indicaciones',
          shortLabel: 'Indicac.',
          icon: medsIcon,
          match: (p: string) => p.startsWith('/prescriptions-history'),
        },
        {
          path: certsPath,
          label: 'Certificados',
          shortLabel: 'Certif.',
          icon: certsIcon,
          match: (p: string) => p.includes('/certificates'),
        },
        {
          path: '/mi-cuenta',
          label: 'Mi cuenta',
          shortLabel: 'Cuenta',
          icon: accountIcon,
          match: (p: string) => p.startsWith('/mi-cuenta'),
        },
      ]
    : [
        {
          path: '/residents',
          label: 'Residentes',
          shortLabel: 'Residentes',
          icon: patientsIcon,
          match: (p: string) => p.startsWith('/residents'),
        },
        {
          path: '/medical-guide',
          label: 'Guía médica',
          shortLabel: 'Guía',
          icon: clinicalIcon,
          match: (p: string) => p.startsWith('/medical-guide'),
        },
        ...((isOwner || isDoctor)
          ? [
              {
                path: '/activity',
                label: 'Noticias',
                shortLabel: 'Noticias',
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
                shortLabel: 'Finanzas',
                icon: homeIcon,
                match: (p: string) => p.startsWith('/finance'),
              },
              {
                path: '/staff',
                label: 'Personal',
                shortLabel: 'Personal',
                icon: patientsIcon,
                match: (p: string) => p.startsWith('/staff'),
              },
              {
                path: '/attendance',
                label: 'Asistencia',
                shortLabel: 'Asistencia',
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
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 px-0.5 ${
                isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.icon}
              <span className="text-[10px] sm:text-xs mt-0.5 truncate max-w-full text-center leading-tight">
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
