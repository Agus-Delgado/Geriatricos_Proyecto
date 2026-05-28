# Cloudflare Worker — Tests de contrato (Bloques 8–11)

Tests mínimos de contrato HTTP en `cloudflare-worker/`, ejecutados con **Vitest** y **`@cloudflare/vitest-pool-workers`** (runtime Workers + D1 aislado).

## Alcance — Auth (Bloque 8)

| Caso | Endpoint | Esperado |
|------|----------|----------|
| Login OK | `POST /auth/login` | `200`, `access_token` no vacío, `token_type: bearer` |
| Login fallido | `POST /auth/login` | `401`, `detail: Credenciales inválidas` |
| Me sin token | `GET /auth/me` | `401`, `detail: Not authenticated` |
| Me con token | `GET /auth/me` | `200`, perfil demo con campos clave |

## Alcance — Facilities (Bloque 9)

| Caso | Endpoint | Esperado |
|------|----------|----------|
| List sin token | `GET /facilities` | `401`, `detail: Not authenticated` |
| List con token | `GET /facilities` | `200`, array con `fac-demo-001` |
| Detalle por id | `GET /facilities/fac-demo-001` | `200`, facility demo |
| Detalle por slug | `GET /facilities/by-slug/hogar-demo-centro` | `200`, `id: fac-demo-001` |

No se asserta el JWT completo ni timestamps dinámicos.

## Alcance — Residents (Bloque 10)

| Caso | Endpoint | Esperado |
|------|----------|----------|
| List sin token | `GET /residents?facility_id=fac-demo-001` | `401`, `detail: Not authenticated` |
| List con token | `GET /residents?facility_id=fac-demo-001` | `200`, incluye `res-demo-001` |
| Detalle | `GET /residents/res-demo-001` | `200`, residente demo |
| Alta minima | `POST /residents` | `201`, residente nuevo |
| Actualizar | `PATCH /residents/:id` | `200`, campo actualizado |
| Soft delete | `DELETE /residents/:id` luego `GET` | `204` y luego `404` |
| Alta con contactos | `POST /residents` con `contacts[]` | `201` |

## Alcance — Contacts (Bloque 11)

| Caso | Endpoint | Esperado |
|------|----------|----------|
| List sin token | `GET /residents/res-demo-001/contacts` | `401`, `detail: Not authenticated` |
| List con token | `GET /residents/res-demo-001/contacts` | `200`, incluye `rc-demo-001` |
| Residente inexistente | `GET /residents/res-does-not-exist/contacts` | `404`, `Residente no encontrado` |
| Alta contacto | `POST /residents/res-demo-001/contacts` | `201`, contacto creado |
| Actualizar | `PATCH /residents/:id/contacts/:contactId` | `200`, campo actualizado |
| Hard delete | `DELETE .../contacts/:id` luego list | `204` y contacto ausente en listado |

## Prerrequisitos

Desde `cloudflare-worker/`:

```bash
npm install
```

## Ejecutar tests

```bash
npm test
```

Modo watch (desarrollo):

```bash
npm run test:watch
```

Typecheck:

```bash
npm run typecheck
```

Los tests aplican migraciones y `seed/dev_seed.sql` automáticamente en el entorno de Vitest. **No** hace falta levantar `wrangler dev` ni ejecutar `wrangler d1 execute` antes.

## Credenciales demo (solo tests / local)

Datos ficticios definidos en `seed/dev_seed.sql`:

- **Username:** `00000000` o `admin.demo@local.invalid`
- **Password:** `AdminDemo123!`

No usar credenciales reales ni este seed en producción.

## Archivos relevantes

- `vitest.config.ts` — integración Wrangler + D1
- `test/apply-migrations.ts` — migraciones D1
- `test/seed-dev.ts` — seed demo
- `test/auth.contract.test.ts` — 4 casos de contrato auth
- `test/facilities.contract.test.ts` — 4 casos de contrato facilities
- `test/residents.contract.test.ts` — 7 casos de contrato residents
- `test/contacts.contract.test.ts` — 6 casos de contrato contacts

Contratos documentados en [cloudflare-worker-auth.md](./cloudflare-worker-auth.md), [cloudflare-worker-facilities.md](./cloudflare-worker-facilities.md), [cloudflare-worker-residents.md](./cloudflare-worker-residents.md) y [cloudflare-worker-contacts.md](./cloudflare-worker-contacts.md).

## Troubleshooting

- Si falla la instalación del pool, reinstalar dependencias: `rm -rf node_modules && npm install` (o equivalente en Windows).
- Si cambian migraciones o seed, los tests deben seguir pasando con `npm test` sin pasos manuales extra.
