# Cloudflare Worker Clinical (Bloque 13)

Endpoints clínicos mínimos en `cloudflare-worker/`, montados bajo `/residents/:residentId`, compatibles con `frontend/src/types/clinical.ts`.

## Alcance implementado

- `GET /residents/:residentId/clinical-summary` — resumen clínico
- `PUT /residents/:residentId/clinical-summary` — upsert del resumen
- `GET /residents/:residentId/clinical-notes` — listado de notas (`recorded_at DESC`)
- `POST /residents/:residentId/clinical-notes` — alta de nota (`201`)

Reutiliza `requireAuth` del router padre (`residentsRouter`), `fetchResidentById`, `assertFacilityAccess` y `canMutateResidents`.

## Fuera de alcance

- `GET /residents/:residentId/clinical-history.pdf`
- Signos vitales, medications, documents
- Activity feed y audit avanzado

## Autenticación

Todas las rutas requieren:

`Authorization: Bearer <token>`

Obtener token con `POST /auth/login` (ver [cloudflare-worker-auth.md](./cloudflare-worker-auth.md)).

## Control de acceso

| Operación | Regla |
|-----------|--------|
| `GET` summary | Residente activo + acceso a `resident.facility_id` |
| `PUT` summary | Mismo acceso + rol en facility `admin`, `medico` o `doctor`; platform admin global |
| `GET` / `POST` notes | Igual que `PUT` summary |

Errores JSON: `{ "detail": "..." }`

| Código | Mensaje típico |
|--------|----------------|
| `401` | `Not authenticated` |
| `403` | `No tiene acceso a esta sede` / `No tiene permisos para esta acción` |
| `404` | `Residente no encontrado` / `Resumen clínico no encontrado` |
| `422` | `content es requerido` |

## Tablas D1

Migración: `cloudflare-worker/migrations/0003_clinical_phase.sql`

- `clinical_summaries` — una fila por residente (`resident_id` UNIQUE)
- `clinical_notes` — evoluciones/incidentes por residente

Columnas alineadas 1:1 con el JSON del frontend (no con nombres internos de PostgreSQL/FastAPI).

## Shape de respuesta (`ClinicalSummary`)

```json
{
  "id": "cs-demo-001",
  "resident_id": "res-demo-001",
  "primary_diagnosis": "Hipertension arterial controlada",
  "secondary_diagnoses": "Diabetes tipo 2",
  "allergies": "Penicilina",
  "current_medications": "Metformina 500mg",
  "medical_history": "Antecedente de caida leve en 2024",
  "family_history": "Sin antecedentes relevantes reportados",
  "updated_by_user_id": "usr-admin-demo-001",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

## Shape de respuesta (`ClinicalNote`)

```json
{
  "id": "cn-demo-001",
  "resident_id": "res-demo-001",
  "facility_id": "fac-demo-001",
  "author_user_id": "usr-admin-demo-001",
  "note_type": "EVOLUTION",
  "content": "Paciente estable. Continua con controles rutinarios.",
  "recorded_at": "2026-01-15T10:00:00Z",
  "created_at": "2026-01-15T10:00:00Z"
}
```

## Endpoints

### GET /residents/:residentId/clinical-summary

Response `200`: `ClinicalSummary`.

Response `404` si el residente no existe o no hay fila de resumen (`Resumen clínico no encontrado`).

### PUT /residents/:residentId/clinical-summary

Body parcial (`ClinicalSummaryUpdate`). Solo se aplican:

`primary_diagnosis`, `secondary_diagnoses`, `allergies`, `current_medications`, `medical_history`, `family_history`

Claves desconocidas se ignoran. Comportamiento upsert: crea si no existe, actualiza si existe. Siempre setea `updated_by_user_id` y `updated_at`.

Response `200`: `ClinicalSummary`.

### GET /residents/:residentId/clinical-notes

Response `200`: array de `ClinicalNote`, orden `recorded_at DESC`.

### POST /residents/:residentId/clinical-notes

Body:

```json
{
  "note_type": "EVOLUTION",
  "content": "Texto de la nota",
  "recorded_at": "2026-01-15T10:00:00Z"
}
```

- `content` requerido (no vacío)
- `note_type` opcional, default `EVOLUTION`
- `recorded_at` opcional, default ahora (ISO8601)

Response `201`: `ClinicalNote` creada.

## Archivos relevantes

- `cloudflare-worker/src/modules/clinical/index.ts` — router
- `cloudflare-worker/src/modules/clinical/mapper.ts` — D1 → JSON
- `cloudflare-worker/src/modules/clinical/db.ts` — queries y upsert
- `cloudflare-worker/src/modules/residents/index.ts` — montaje `/:residentId`
- `cloudflare-worker/test/clinical.contract.test.ts` — tests de contrato

## Pruebas

Desde `cloudflare-worker/`:

```bash
npm run typecheck
npm test
```

Ver [cloudflare-worker-testing.md](./cloudflare-worker-testing.md).

## Smoke manual (opcional)

```bash
# Login
curl -s -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"00000000","password":"AdminDemo123!"}'

# Resumen clínico (reemplazar TOKEN)
curl -s "http://localhost:8787/residents/res-demo-001/clinical-summary" \
  -H "Authorization: Bearer TOKEN"

# Notas clínicas
curl -s "http://localhost:8787/residents/res-demo-001/clinical-notes" \
  -H "Authorization: Bearer TOKEN"
```

No usar datos reales ni este seed en producción.
