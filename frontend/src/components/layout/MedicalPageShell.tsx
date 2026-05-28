import React from 'react';

const MEDICAL_BG =
  'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #f5f3ff 100%)';

interface MedicalPageShellProps {
  children: React.ReactNode;
  className?: string;
}

export const MedicalPageShell: React.FC<MedicalPageShellProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`min-h-screen pb-20 relative ${className}`.trim()}
      style={{ background: MEDICAL_BG }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(135deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.04) 100%)',
        }}
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
