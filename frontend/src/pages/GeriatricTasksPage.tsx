import { useParams } from 'react-router-dom';

export default function GeriatricTasksPage() {
  const { id } = useParams();

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          background: 'var(--facility-card)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ margin: 0 }}>Tareas</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Hogar activo: <strong>{id}</strong>
        </p>

        <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.6)' }}>
          Listado de tareas (placeholder)
        </div>
      </div>
    </div>
  );
}
