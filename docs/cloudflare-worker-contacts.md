# Cloudflare Worker Resident Contacts (Bloque 11)

CRUD mínimo de contactos de residentes en `cloudflare-worker/`, montado como sub-router bajo `/residents/:residentId/contacts`, compatible con `frontend/src/types/residents.ts` (`ResidentContact`).

## Alcance implementado

- `GET /residents/:residentId/contacts` — listado
- `POST /residents/:residentId/contacts` — alta (`201`)
- `PATCH /residents/:residentId/contacts/:contactId` — actualización parcial
- `DELETE /residents/:residentId/contacts/:contactId` — borrado real (`204` sin body)

Reutiliza `requireAuth` del router padre (`residentsRouter`) y control de acceso por facility vía `resident.facility_id`.

## Fuera de alcance

- Clinical, medications, documents
- Papelera de residents
- Soft delete de contactos (D1 tiene columna `deleted_at` pero DELETE es hard delete, alineado con FastAPI)

## Autenticación

Todas las rutas requieren:

`Authorization: Bearer <token>`

Obtener token con `POST /auth/login` (ver [cloudflare-worker-auth.md](./cloudflare-worker-auth.md)).

## Control de acceso

| Operación | Regla |
|-----------|--------|
| Lectura (`GET`) | Residente activo + acceso a `resident.facility_id` |
| Escritura (`POST`, `PATCH`, `DELETE`) | Mismo acceso + rol en facility `admin`, `medico` o `doctor`; platform admin/owner global |

Errores JSON: `{ "detail": "..." }`

| Código | Mensaje típico |
|--------|----------------|
| `401` | `Not authenticated` |
| `403` | `No tiene acceso a esta sede` / `No tiene permisos para esta acción` |
| `404` | `Residente no encontrado` / `Contacto no encontrado` |
| `422` | `full_name es requerido` / validación PATCH |

## Mapeo D1 ↔ JSON

| Columna D1 | Campo API |
|------------|-----------|
| `relationship` | `relationship_type` |
| `is_primary` (0/1) | `is_primary` (boolean) |

## Shape de respuesta (`ResidentContact`)

```json
{
  "id": "rc-demo-001",
  "resident_id": "res-demo-001",
  "full_name": "Maria Demo",
  "relationship_type": "Hija",
  "phone": "+54-11-0000-0000",
  "email": "contacto.demo@local.invalid",
  "address": null,
  "is_primary": true,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

## Endpoints

### GET /residents/:residentId/contacts

Response `200`: array de `ResidentContact`. Excluye filas con `deleted_at` (defensivo).

### POST /residents/:residentId/contacts

Body mínimo:

```json
{
  "full_name": "Familiar Demo"
}
```

Opcional: `relationship_type`, `phone`, `email`, `address`, `is_primary`.

Response `201`: contacto creado.

### PATCH /residents/:residentId/contacts/:contactId

Body parcial según `ResidentContactUpdate` del frontend.

Response `200`: contacto actualizado.

### DELETE /residents/:residentId/contacts/:contactId

`DELETE FROM resident_contacts` (hard delete).

Response `204` sin body.

## Relación con POST /residents

`POST /residents` sigue aceptando `contacts[]` inline; usa la misma función `insertResidentContact` que este módulo. Ver [cloudflare-worker-residents.md](./cloudflare-worker-residents.md).

## Archivos relevantes

- `cloudflare-worker/src/modules/contacts/index.ts` — router
- `cloudflare-worker/src/modules/contacts/mapper.ts` — D1 → JSON
- `cloudflare-worker/src/modules/contacts/db.ts` — insert y fetch
- `cloudflare-worker/src/modules/residents/index.ts` — montaje `/:residentId/contacts`
- `cloudflare-worker/test/contacts.contract.test.ts` — tests de contrato

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

# Listar contactos (reemplazar TOKEN)
curl -s "http://localhost:8787/residents/res-demo-001/contacts" \
  -H "Authorization: Bearer TOKEN"
```

No usar datos reales ni este seed en producción.
