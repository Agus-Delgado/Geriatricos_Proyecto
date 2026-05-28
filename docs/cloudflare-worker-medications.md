# Cloudflare Worker Medications (Bloque 14)

Endpoints mínimos de medicación en `cloudflare-worker/`, compatibles con `frontend/src/types/medications.ts`.

## Alcance implementado

- `GET /residents/:residentId/medication-plans` — listado (`active_only` opcional)
- `POST /residents/:residentId/medication-plans` — alta de plan (`201`)
- `POST /medication-plans/:planId/times` — agregar horario (`201`)
- `DELETE /medication-times/:timeId` — borrado real (`204` sin body)

Rutas bajo `/residents` reutilizan `requireAuth` del `residentsRouter`. Rutas top-level usan `requireAuth` propio.

## Fuera de alcance (Bloque 14)

- `PATCH /medication-plans/:planId` (suspender/editar plan)
- Administraciones MAR (`medication-administrations`)
- `GET /facilities/:facilityId/medication-due`
- Activity feed / audit avanzado

Estos endpoints existen en `frontend/src/api/medications.ts` pero **no son consumidos** por la UI actual (p. ej. `MedicationDuePage` redirige a guía médica).

## Autenticación

Todas las rutas requieren:

`Authorization: Bearer <token>`

Obtener token con `POST /auth/login` (ver [cloudflare-worker-auth.md](./cloudflare-worker-auth.md)).

## Control de acceso

| Operación | Regla |
|-----------|--------|
| `GET` plans | Residente activo (`deleted_at IS NULL`) + acceso a `resident.facility_id` |
| `POST` plan, `POST` time, `DELETE` time | Mismo acceso + rol en facility `admin`, `medico` o `doctor`; platform admin global |

Errores JSON: `{ "detail": "..." }`

| Código | Mensaje típico |
|--------|----------------|
| `401` | `Not authenticated` |
| `403` | `No tiene acceso a esta sede` / `No tiene permisos para esta acción` |
| `404` | `Residente no encontrado` / `Plan de medicación no encontrado` / `Horario no encontrado` |
| `422` | `med_name es requerido` / `time debe tener formato HH:MM` |

## Tablas D1

Migración: `cloudflare-worker/migrations/0004_medications_phase.sql`

- `medication_plans`
- `medication_schedule_times` — campos API `time`, `day_of_week` (en D1, diario = `-1` interno, expuesto como `null`)

## Shape de respuesta (`MedicationPlan`)

```json
{
  "id": "mp-demo-001",
  "resident_id": "res-demo-001",
  "facility_id": "fac-demo-001",
  "med_name": "Metformina",
  "dose": "500mg",
  "route": "VO",
  "instructions": "Tomar con las comidas",
  "start_date": "2026-01-01",
  "end_date": null,
  "is_active": true,
  "prescribed_by_user_id": "usr-admin-demo-001",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

## Shape de respuesta (`MedicationScheduleTime`)

```json
{
  "id": "mst-demo-001",
  "medication_plan_id": "mp-demo-001",
  "time": "08:00",
  "day_of_week": null
}
```

`day_of_week`: `0`–`6` (domingo–sábado) o `null` = diario.

## Endpoints

### GET /residents/:residentId/medication-plans

Query:

- `active_only` — `true` o `1` filtra `is_active = 1`

Response `200`: `MedicationPlan[]`, orden `created_at DESC`.

### POST /residents/:residentId/medication-plans

Body (`MedicationPlanCreate`):

- `med_name`, `dose` requeridos
- `route`, `instructions`, `start_date`, `end_date` opcionales

`facility_id` se toma de `resident.facility_id`. `prescribed_by_user_id` = usuario JWT. `is_active` default `true`.

Response `201`: `MedicationPlan`.

### POST /medication-plans/:planId/times

Body:

```json
{
  "time": "08:00",
  "day_of_week": null
}
```

- `time` requerido, formato `HH:MM`
- `day_of_week` opcional; si se envía, entero `0`–`6`

Response `201`: `MedicationScheduleTime`.

### DELETE /medication-times/:timeId

Response `204` sin body.

## Archivos relevantes

- `cloudflare-worker/src/modules/medications/` — db, mapper, routers
- `cloudflare-worker/src/modules/residents/index.ts` — montaje rutas resident
- `cloudflare-worker/src/index.ts` — `/medication-plans`, `/medication-times`
- `cloudflare-worker/test/medications.contract.test.ts` — tests de contrato

## Pruebas

Desde `cloudflare-worker/`:

```bash
npm run typecheck
npm test
```

Ver [cloudflare-worker-testing.md](./cloudflare-worker-testing.md).

## Smoke manual (opcional)

```bash
curl -s -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"00000000","password":"AdminDemo123!"}'

curl -s "http://localhost:8787/residents/res-demo-001/medication-plans" \
  -H "Authorization: Bearer TOKEN"
```

No usar datos reales ni este seed en producción.
