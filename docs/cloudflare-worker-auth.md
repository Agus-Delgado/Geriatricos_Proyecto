# Cloudflare Worker Auth (Bloque 7)

Implementacion minima de autenticacion real en `cloudflare-worker/` para entorno local/dev con D1.

## Alcance implementado

- `POST /auth/login`
- `GET /auth/me`
- Middleware JWT Bearer para rutas protegidas
- JWT HS256 con Web Crypto (compatible con Workers)
- Password hashing/verificacion con `@noble/hashes` + `scrypt`
- Seed dev con hash real verificable para usuario demo

## Endpoints y contrato

### POST /auth/login

Request:

```json
{
  "username": "00000000",
  "password": "AdminDemo123!"
}
```

Notas:
- `username` acepta DNI o email.
- Valida `is_active`.
- Valida `password` contra `password_hash`.

Response OK:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

Errores:
- `401` credenciales invalidas
- `403` usuario inactivo

### GET /auth/me

Header requerido:

`Authorization: Bearer <token>`

Respuesta compatible con frontend (campos faltantes en D1 Fase 1 se completan con defaults seguros):

```json
{
  "id": "usr-admin-demo-001",
  "email": "admin.demo@local.invalid",
  "dni": "00000000",
  "phone": null,
  "full_name": "Admin Demo",
  "license_number": null,
  "is_active": true,
  "is_verified": true,
  "is_platform_admin": false,
  "active_facility_id": "fac-demo-001",
  "last_login_at": null,
  "roles": [
    { "id": "role-admin", "code": "ADMIN", "name": "Admin" }
  ],
  "memberships": [
    {
      "id": "fu-demo-001",
      "facility_id": "fac-demo-001",
      "facility_name": "Hogar Demo Centro",
      "facility_code": "hogar-demo-centro",
      "role": "ADMIN",
      "is_active": true
    }
  ]
}
```

## JWT (HS256) en Workers

- Firma/verificacion con `crypto.subtle` (`HMAC` + `SHA-256`).
- Claims minimas:
  - `sub` (user id)
  - `exp` (epoch seconds)
  - `active_facility_id` y `facility_id` si aplica
  - `email` y `dni` cuando existen
- Se valida expiracion en middleware.

## Password hashing (scrypt)

Decision: `@noble/hashes` + `scrypt` por compatibilidad con Worker runtime.

Formato versionado:

`scrypt$v1$<N>$<r>$<p>$<salt_base64>$<hash_base64>`

Parametros actuales:
- `N=16384`
- `r=8`
- `p=1`
- `dkLen=32`
- salt aleatoria de 16 bytes

## Variables requeridas

En `cloudflare-worker/wrangler.toml` (solo dev/local):

- `JWT_SECRET`
- `JWT_EXPIRES_IN_SECONDS` (default local/dev: `28800` si no se define)
- `CORS_ORIGINS`
- `ENVIRONMENT`

No usar secretos reales de produccion en este archivo.

## Usuario demo (solo desarrollo)

- Email: `admin.demo@local.invalid`
- DNI: `00000000`
- Password: `AdminDemo123!`

`seed/dev_seed.sql` contiene hash real verificable para ese password.

## Prueba local paso a paso

Desde `cloudflare-worker/`:

1) Instalar deps

```bash
npm install
```

2) Aplicar migracion local

```bash
npx wrangler d1 migrations apply geriatricos_d1_dev --local
```

3) Aplicar seed local

```bash
npx wrangler d1 execute geriatricos_d1_dev --local --file=seed/dev_seed.sql
```

4) Typecheck

```bash
npm run typecheck
```

5) Levantar Worker

```bash
npm run dev
```

6) Probar login

```bash
curl -X POST http://127.0.0.1:8787/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"00000000\",\"password\":\"AdminDemo123!\"}"
```

7) Probar `/auth/me` con token

```bash
curl http://127.0.0.1:8787/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

## Mapeo de roles documentado

- `users.role` global:
  - `owner` o `platform_admin` -> role code `OWNER`
  - `doctor` o `medico` -> role code `DOCTOR`
  - `admin` -> role code `ADMIN`
  - `staff` -> role code `STAFF`
- `facility_users.role` (membership):
  - `admin` -> `ADMIN`
  - `doctor` o `medico` -> `MEDICO`
  - `staff` -> `STAFF`

## Tests de contrato

Tests automatizados (Vitest + Workers pool) para `POST /auth/login` y `GET /auth/me`.

Ver [cloudflare-worker-testing.md](./cloudflare-worker-testing.md). Desde `cloudflare-worker/`: `npm test`.

## Advertencia

Las credenciales y datos demo son solo para desarrollo local.
No usar estas credenciales ni este seed en produccion.
