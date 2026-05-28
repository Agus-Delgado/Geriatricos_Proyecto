import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { shouldUseMedicalUi } from '../../utils/medicalExperience';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Forzar layout con safe areas y espacio para bottom nav. */
  variant?: 'default' | 'medical';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  variant,
}) => {
  const location = useLocation();
  const isMedicalLayout =
    variant === 'medical' ||
    (variant !== 'default' && shouldUseMedicalUi(location.pathname));

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  const overlayClass = isMedicalLayout
    ? 'fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-black bg-opacity-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-4'
    : 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4';

  const panelClass = isMedicalLayout
    ? `bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[min(90vh,calc(100dvh-5.5rem))] sm:max-h-[min(90vh,calc(100dvh-2rem))] overflow-hidden flex flex-col`
    : `bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`;

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0 bg-white rounded-t-lg">
            <h2 className="text-lg font-semibold text-gray-900 pr-4">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        )}
        <div className="p-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">{children}</div>
        {footer ? (
          <div className="p-4 border-t border-gray-200 shrink-0 bg-white rounded-b-lg">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};
