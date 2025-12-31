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
    <div className="print-root" style={{ background: '#f9fafb', minHeight: '100vh', padding: '32px 0' }}>
      <div className="print-actions no-print" style={{ textAlign: 'right', maxWidth: 900, margin: '0 auto 16px auto' }}>
        <button onClick={print} className="btn btn-primary">Imprimir</button>
      </div>
      <div className="a4-page" style={{ maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 32 }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>Ficha del Paciente</h1>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{facility?.name}</div>
          {facility?.address && <div style={{ color: '#555', fontSize: 15 }}>{facility.address}</div>}
          <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Generado: {new Date().toLocaleString('es-AR')}</div>
        </header>
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, borderBottom: '2px solid #3b82f6', paddingBottom: 4, marginBottom: 18, color: '#1e40af' }}>Datos personales</h2>
          <div>
            <div style={{ display: 'flex', marginBottom: 8 }}><div style={{ width: 200, fontWeight: 600 }}>Nombre</div><div>{resident.last_name}, {resident.first_name}</div></div>
            <div style={{ display: 'flex', marginBottom: 8 }}><div style={{ width: 200, fontWeight: 600 }}>DNI</div><div>{resident.dni || 'N/A'}</div></div>
            <div style={{ display: 'flex', marginBottom: 8 }}><div style={{ width: 200, fontWeight: 600 }}>Fecha nacimiento</div><div>{resident.birth_date || 'N/A'}</div></div>
            <div style={{ display: 'flex', marginBottom: 8 }}><div style={{ width: 200, fontWeight: 600 }}>Sexo</div><div>{resident.sex || 'N/A'}</div></div>
            <div style={{ display: 'flex', marginBottom: 8 }}><div style={{ width: 200, fontWeight: 600 }}>Cobertura</div><div>{resident.coverage_type || 'N/A'}</div></div>
            <div style={{ display: 'flex', marginBottom: 8 }}><div style={{ width: 200, fontWeight: 600 }}>N° Cobertura</div><div>{resident.coverage_number || 'N/A'}</div></div>
            <div style={{ display: 'flex', marginBottom: 8 }}><div style={{ width: 200, fontWeight: 600 }}>Ingreso</div><div>{resident.admission_date}</div></div>
          </div>
        </section>
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, borderBottom: '2px solid #3b82f6', paddingBottom: 4, marginBottom: 18, color: '#1e40af' }}>Familiares y contactos</h2>
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
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, borderBottom: '2px solid #3b82f6', paddingBottom: 4, marginBottom: 18, color: '#1e40af' }}>Observaciones</h2>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, minHeight: 60, padding: 12, background: '#f9fafb', fontSize: 15 }}>{resident.notes || <span style={{ color: '#bbb' }}>Sin observaciones</span>}</div>
        </section>
        <section style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, borderBottom: '2px solid #3b82f6', paddingBottom: 4, marginBottom: 18, color: '#1e40af' }}>Firma</h2>
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 32, height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', color: '#888', fontSize: 15 }}>
            .....................................................
          </div>
        </section>
      </div>
    </div>
  );
}

