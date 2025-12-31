import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { contactsApi } from '../api/contacts';
import { useFacility } from '../contexts/FacilityContext';
import type { Resident, ResidentContact } from '../types/residents';
import '../components/certificates/print.css';

export default function ResidentPrintPage() {
  const { id } = useParams();
  const { facility } = useFacility();
  const [resident, setResident] = useState<Resident | null>(null);
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const r = await residentsApi.get(id);
        const c = await contactsApi.list(id);
        setResident(r);
        setContacts(c);
      } catch (e) {
        setError('Error al cargar datos del paciente');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const print = () => window.print();

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!resident) return null;

  return (
    <div className="print-bg">
      <div className="no-print" style={{ textAlign: 'right', maxWidth: 750, margin: '0 auto 16px auto' }}>
        <button onClick={print} className="btn btn-primary">Imprimir</button>
      </div>
      <div className="content">
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>Ficha del Paciente</h1>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{facility?.name}</div>
          {facility?.address && <div style={{ color: '#555', fontSize: 15 }}>{facility.address}</div>}
          <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Generado: {new Date().toLocaleString('es-AR')}</div>
        </header>
        <section className="section">
          <div className="section-title">Datos personales</div>
          <div>
            <div className="info-row"><div className="info-label">Nombre</div><div className="info-value">{resident.last_name}, {resident.first_name}</div></div>
            <div className="info-row"><div className="info-label">DNI</div><div className="info-value">{resident.dni || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Fecha nacimiento</div><div className="info-value">{resident.birth_date || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Sexo</div><div className="info-value">{resident.sex || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Cobertura</div><div className="info-value">{resident.coverage_type || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">N° Cobertura</div><div className="info-value">{resident.coverage_number || 'N/A'}</div></div>
            <div className="info-row"><div className="info-label">Ingreso</div><div className="info-value">{resident.admission_date}</div></div>
          </div>
        </section>
        <section className="section">
          <div className="section-title">Familiares y contactos</div>
          {contacts.length === 0 ? (
            <div style={{ color: '#888' }}>No hay contactos registrados</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', width: 200 }}>Nombre</th>
                  <th style={{ textAlign: 'left', width: 120 }}>Relación</th>
                  <th style={{ textAlign: 'left', width: 120 }}>Teléfono</th>
                  <th style={{ textAlign: 'left', width: 180 }}>Email</th>
                  <th style={{ textAlign: 'left', width: 180 }}>Dirección</th>
                  <th style={{ textAlign: 'left', width: 80 }}>Principal</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td>{c.full_name}</td>
                    <td>{c.relationship_type || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.address || '—'}</td>
                    <td>{c.is_primary ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="section">
          <div className="section-title">Observaciones</div>
          <div className="textarea">{resident.notes || <span style={{ color: '#bbb' }}>Sin observaciones</span>}</div>
        </section>
        <section className="section">
          <div className="section-title">Firma</div>
          <div className="signature-line">&nbsp;</div>
        </section>
      </div>
    </div>
  );
}

