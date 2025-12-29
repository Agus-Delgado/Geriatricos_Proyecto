import React from 'react';
import './print.css';

interface RxPaperFrameProps {
  children: React.ReactNode;
  className?: string;
  headerDate?: string;
}

export function RxPaperFrame({ children, className = '', headerDate }: RxPaperFrameProps) {
  // Formatear fecha si se proporciona
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formattedDate = headerDate ? formatDate(headerDate) : '';

  return (
    <div className={`paper ${className}`}>
      {/* Header con estilo Rx */}
      <div className="paper-header">
        {/* Rx grande a la izquierda */}
        <div className="paper-rx">
          <svg
            width="60"
            height="60"
            viewBox="0 0 60 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <text
              x="30"
              y="45"
              fontSize="48"
              fontWeight="bold"
              fill="#000"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
            >
              Rx
            </text>
          </svg>
        </div>

        {/* Fecha a la derecha */}
        {formattedDate && (
          <div className="paper-date">
            <span className="paper-date-label">Fecha:</span>
            <span className="paper-date-value">{formattedDate}</span>
          </div>
        )}

        {/* Líneas superiores para Paciente/Domicilio */}
        <div className="paper-header-lines">
          <div className="paper-line">
            <span className="paper-line-label">Paciente:</span>
            <span className="paper-line-content"></span>
          </div>
          <div className="paper-line">
            <span className="paper-line-label">Domicilio:</span>
            <span className="paper-line-content"></span>
          </div>
        </div>
      </div>

      {/* Área de contenido centrado */}
      <div className="paper-content">
        {children}
      </div>

      {/* Elementos decorativos inferiores */}
      <div className="paper-footer-decorative">
        <svg
          width="100%"
          height="40"
          viewBox="0 0 100 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="10"
            x2="100"
            y2="10"
            stroke="#000"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
          <line
            x1="0"
            y1="20"
            x2="100"
            y2="20"
            stroke="#000"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
          <rect
            x="5"
            y="30"
            width="90"
            height="8"
            stroke="#000"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
