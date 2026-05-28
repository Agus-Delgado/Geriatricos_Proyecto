# Cloudflare Worker Residents (Bloque 10)

Endpoints minimos de residentes en `cloudflare-worker/` para entorno local/dev con D1, compatibles con `frontend/src/types/residents.ts`.

## Alcance implementado

- `GET /residents?facility_id=...` — listado con filtros opcionales `q`, `stay_status`, `status`
- `GET /residents/:residentId` — detalle
- `POST /residents` — alta (acepta `contacts[]` inline opcional)
- `PATCH /residents/:residentId` — actualizacion parcial
- `DELETE /residents/:residentId` — soft delete (`204` sin body)

Reutiliza `requireAuth` y control de acceso por facility (`facility_users` + platform admin/owner).

## Fuera de alcance

- Papelera: `GET /residents/deleted`, `POST /residents/:id/restore`
- Documentos / Cloudinary: `POST /residents/:id/document`
- Clinical, medications, staff, agenda

CRUD de contactos por residente: ver [cloudflare-worker-contacts.md](./cloudflare-worker-contacts.md).

## Autenticacion

Todas las rutas requieren:

`Authorization: Bearer <token>`

Obtener token con `POST /auth/login` (ver [cloudflare-worker-auth.md](./cloudflare-worker-auth.md)).

## Control de acceso

| Operacion | Regla |
|-----------|--------|
| Lectura (`GET`) | Usuario con acceso a la facility (`facility_id` query o `resident.facility_id`) |
| Escritura (`POST`, `PATCH`, `DELETE`) | Mismo acceso + rol en facility `admin`, `medico` o `doctor`; platform admin/owner global |

Errores JSON: `{ "detail": "..." }`

| Codigo | Mensaje tipico |
|--------|----------------|
| `401` | `Not authenticated` |
| `403` | `No tiene acceso a esta sede` / `No tiene permisos para esta acción` |
| `404` | `Residente no encontrado` |
| `400` | `El residente ya está eliminado` |
| `422` | Validacion de campos |

## Migracion D1

`migrations/0002_residents_frontend_align.sql` agrega columnas al contrato `Resident` del frontend (`admission_date`, `stay_status`, cobertura, `end_*`, `notes`, documentos, audit). `resident_contacts` recibe `address` para contactos inline en POST.

## Endpoints

### GET /residents

Query requerida: `facility_id`

Query opcional: `q`, `stay_status`, `status`

Response `200`: array de objetos `Resident`.

### GET /residents/:residentId

Response `200`: objeto `Resident`. Excluye residentes con `deleted_at` distinto de null.

### POST /residents

Body minimo:

```json
{
  "facility_id": "fac-demo-001",
  "first_name": "Ana",
  "last_name": "Demo",
  "admission_date": "2026-02-01"
}
```

Opcional: `contacts[]` con `full_name`, `relationship_type`, `phone`, `email`, `address`, `is_primary`.

Response `201`: objeto `Resident` creado.

### PATCH /residents/:residentId

Body parcial segun `ResidentUpdate` del frontend.

Response `200`: objeto `Resident` actualizado.

### DELETE /residents/:residentId

Soft delete: establece `deleted_at` y `deleted_by_user_id`.

Response `204` sin body.

## Archivos relevantes

- `cloudflare-worker/src/modules/residents/index.ts` — router
- `cloudflare-worker/src/modules/residents/access.ts` — acceso y roles de mutacion
- `cloudflare-worker/src/modules/residents/mapper.ts` — mapeo D1 → JSON
- `cloudflare-worker/test/residents.contract.test.ts` — tests de contrato
- `cloudflare-worker/migrations/0002_residents_frontend_align.sql`

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

# Listar residentes (reemplazar TOKEN)
curl -s "http://localhost:8787/residents?facility_id=fac-demo-001" \
  -H "Authorization: Bearer TOKEN"
```

No usar datos reales ni este seed en produccion.
