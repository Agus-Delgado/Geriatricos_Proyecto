import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrintDocument } from '../components/certificates/PrintDocument';
import type { CertificateDraft } from '../types/certificates';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function CertificatePrintPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CertificateDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const draftJson = sessionStorage.getItem('printDraft');
    if (draftJson) {
      try {
        const parsedDraft = JSON.parse(draftJson) as CertificateDraft;
        setDraft(parsedDraft);
        sessionStorage.removeItem('printDraft');
      } catch (error) {
        console.error('Error al parsear draft:', error);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-600 mb-4 text-center max-w-md">
          No hay un certificado listo para imprimir. Vuelva al listado e intente de nuevo.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="no-print" style={{ padding: 16, background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Imprimir / guardar PDF
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Volver
          </button>
        </div>
      </div>

      <PrintDocument draft={draft} />
    </div>
  );
}
