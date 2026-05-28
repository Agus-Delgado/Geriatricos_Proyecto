# Cloudflare Worker — Tests de contrato (Bloque 8)

Tests mínimos de contrato HTTP para autenticación en `cloudflare-worker/`, ejecutados con **Vitest** y **`@cloudflare/vitest-pool-workers`** (runtime Workers + D1 aislado).

## Alcance

| Caso | Endpoint | Esperado |
|------|----------|----------|
| Login OK | `POST /auth/login` | `200`, `access_token` no vacío, `token_type: bearer` |
| Login fallido | `POST /auth/login` | `401`, `detail: Credenciales inválidas` |
| Me sin token | `GET /auth/me` | `401`, `detail: Not authenticated` |
| Me con token | `GET /auth/me` | `200`, perfil demo con campos clave |

No se asserta el JWT completo ni timestamps dinámicos.

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
- `test/auth.contract.test.ts` — 4 casos de contrato

Contrato documentado en [cloudflare-worker-auth.md](./cloudflare-worker-auth.md).

## Troubleshooting

- Si falla la instalación del pool, reinstalar dependencias: `rm -rf node_modules && npm install` (o equivalente en Windows).
- Si cambian migraciones o seed, los tests deben seguir pasando con `npm test` sin pasos manuales extra.
