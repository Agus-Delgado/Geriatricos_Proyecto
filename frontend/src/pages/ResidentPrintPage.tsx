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
    <div className="print-container">
      <div className="print-actions no-print">
        <button onClick={print} className="btn btn-primary">Imprimir</button>
      </div>

      <div className="a4-page">
        <header className="print-header">
          <h1>Ficha del Paciente</h1>
          <div className="facility-info">
            <div>{facility?.name}</div>
            {facility?.address && <div>{facility.address}</div>}
          </div>
          <div className="timestamp">{new Date().toLocaleString('es-AR')}</div>
        </header>

        <section className="section">
          <h2>Datos del paciente</h2>
          <div className="grid grid-cols-2 gap-2">
            <div><strong>Nombre:</strong> {resident.last_name}, {resident.first_name}</div>
            <div><strong>DNI:</strong> {resident.dni || 'N/A'}</div>
            <div><strong>Fecha nacimiento:</strong> {resident.birth_date || 'N/A'}</div>
            <div><strong>Sexo:</strong> {resident.sex || 'N/A'}</div>
            <div><strong>Cobertura:</strong> {resident.coverage_type || 'N/A'}</div>
            <div><strong>N° Cobertura:</strong> {resident.coverage_number || 'N/A'}</div>
            <div><strong>Ingreso:</strong> {resident.admission_date}</div>
            <div><strong>Estado:</strong> {resident.status}</div>
          </div>
        </section>

        <section className="section">
          <h2>Familiares y contactos</h2>
          {contacts.length === 0 ? (
            <div>No hay contactos registrados</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Nombre</th>
                  <th className="text-left">Relación</th>
                  <th className="text-left">Teléfono</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Dirección</th>
                  <th className="text-left">Principal</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
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
      </div>
    </div>
  );
}

