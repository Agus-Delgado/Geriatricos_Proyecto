import { Component, ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // SIEMPRE loguear el error (también en producción para diagnóstico)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Guardar errorInfo en state para mostrar detalles si es necesario
    this.setState({
      errorInfo,
    });
  }

  handleGoHome = (): void => {
    // Usar window.location.assign para garantizar navegación incluso si router está roto
    window.location.assign('/');
  };

  handleReload = (): void => {
    // Recargar página completamente
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              borderRadius: '0.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '1.5rem',
              backgroundColor: 'white',
              pointerEvents: 'auto',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#111827',
                  marginBottom: '0.5rem',
                }}
              >
                Algo salió mal
              </h1>
              <p
                style={{
                  color: '#4b5563',
                  marginBottom: '1.5rem',
                }}
              >
                Ocurrió un error inesperado. Por favor, intenta volver al inicio
                o recargar la página.
              </p>
              
              {/* Mostrar error en desarrollo o si hay errorInfo */}
              {(this.state.error || this.state.errorInfo) && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fef2f2',
                    borderRadius: '0.375rem',
                    textAlign: 'left',
                  }}
                >
                  {this.state.error && (
                    <p
                      style={{
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        color: '#991b1b',
                        wordBreak: 'break-all',
                        marginBottom: this.state.errorInfo ? '0.5rem' : 0,
                      }}
                    >
                      {this.state.error.message}
                    </p>
                  )}
                  {this.state.errorInfo && import.meta.env.DEV && (
                    <details style={{ fontSize: '0.75rem', color: '#991b1b' }}>
                      <summary style={{ cursor: 'pointer', marginTop: '0.5rem' }}>
                        Detalles técnicos
                      </summary>
                      <pre
                        style={{
                          marginTop: '0.5rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#667eea',
                    color: 'white',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    pointerEvents: 'auto',
                    minHeight: '44px',
                    minWidth: '120px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5568d3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#667eea';
                  }}
                >
                  Volver al inicio
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    fontWeight: '500',
                    border: '1px solid #d1d5db',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    pointerEvents: 'auto',
                    minHeight: '44px',
                    minWidth: '120px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  Recargar página
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}