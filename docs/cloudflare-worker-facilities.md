# Cloudflare Worker Facilities (Bloque 9)

Endpoints minimos de lectura de sedes en `cloudflare-worker/` para entorno local/dev con D1.

## Alcance implementado

- `GET /facilities` — lista de sedes accesibles para el usuario autenticado
- `GET /facilities/by-slug/:slug` — detalle por slug (con control de acceso)
- `GET /facilities/:facilityId` — detalle por id (con control de acceso)
- Reutiliza middleware `requireAuth` (JWT Bearer existente)
- Validacion de acceso via `facility_users` + rol global en `users`

Fuera de alcance en este bloque:

- CRUD de facilities
- Residents, contacts y demas modulos
- `POST /auth/active-facility` (cambio de sede activa; bloque auth futuro)

## Autenticacion

Todas las rutas requieren:

`Authorization: Bearer <token>`

Obtener token con `POST /auth/login` (ver [cloudflare-worker-auth.md](./cloudflare-worker-auth.md)).

## Control de acceso

| Tipo de usuario | Regla |
|-----------------|--------|
| Usuario normal | Debe tener fila activa en `facility_users` (`is_active = 1`) para la sede |
| Platform admin / owner | `users.role` ∈ `owner`, `platform_admin` — acceso a cualquier sede activa |

Errores:

- `401` — sin token o token invalido
- `403` — `No tiene acceso a esta sede`
- `404` — sede inexistente o inactiva (`Sede no encontrada` / `Geriátrico no encontrado`)

## Mapeo D1 → respuesta frontend

La tabla `facilities` en D1 Fase 1 no tiene `code` ni `address`. La respuesta JSON sigue el tipo `Facility` del frontend:

| Campo respuesta | Origen |
|-----------------|--------|
| `id` | `facilities.id` |
| `name` | `facilities.name` |
| `code` | `slug ?? id` |
| `slug` | `facilities.slug` |
| `address` | siempre `null` |
| `is_active` | `facilities.is_active === 1` |

## Endpoints

### GET /facilities

Lista sedes accesibles.

- Usuario normal: join `facility_users` + `facilities` (ambos activos)
- Platform admin: todas las `facilities` con `is_active = 1`

Response `200`:

```json
[
  {
    "id": "fac-demo-001",
    "name": "Hogar Demo Centro",
    "code": "hogar-demo-centro",
    "slug": "hogar-demo-centro",
    "address": null,
    "is_active": true
  }
]
```

### GET /facilities/by-slug/:slug

Detalle por slug. La ruta se registra **antes** de `/:facilityId` en el router.

Response `200`: mismo objeto `Facility` que el detalle por id.

### GET /facilities/:facilityId

Detalle por id de sede.

Response `200`:

```json
{
  "id": "fac-demo-001",
  "name": "Hogar Demo Centro",
  "code": "hogar-demo-centro",
  "slug": "hogar-demo-centro",
  "address": null,
  "is_active": true
}
```

## Archivos relevantes

- `cloudflare-worker/src/modules/facilities/index.ts` — router
- `cloudflare-worker/src/modules/facilities/access.ts` — membership y platform admin
- `cloudflare-worker/src/modules/facilities/mapper.ts` — mapeo a contrato frontend
- `cloudflare-worker/test/facilities.contract.test.ts` — tests de contrato

## Pruebas

Desde `cloudflare-worker/`:

```bash
npm test
npm run typecheck
```

Credenciales demo (seed local): ver [cloudflare-worker-testing.md](./cloudflare-worker-testing.md).

## Smoke manual (opcional)

Con `wrangler dev` y D1 local:

```bash
# 1) Login
curl -s -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"00000000","password":"AdminDemo123!"}'

# 2) Listar facilities (reemplazar TOKEN)
curl -s http://localhost:8787/facilities \
  -H "Authorization: Bearer TOKEN"
```

No usar datos reales ni este seed en produccion.
