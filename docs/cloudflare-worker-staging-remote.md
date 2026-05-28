# Cloudflare Worker — Staging remoto (Bloque 16)

Runbook para D1 remota `geriatricos_d1_staging` y Worker `geriatricos-worker-staging`. **No toca Vercel ni Render.** Validación inicial por `curl`.

**ETAPA 1 (repo):** `[env.staging]` en [`cloudflare-worker/wrangler.toml`](../cloudflare-worker/wrangler.toml), [`seed/staging_seed.sql`](../cloudflare-worker/seed/staging_seed.sql) — sin crear D1 ni deploy.

**ETAPA 2 (manual):** comandos de este documento, en orden.

Referencias: [cloudflare-worker-deploy-readiness.md](./cloudflare-worker-deploy-readiness.md), [cloudflare-d1-local-dev.md](./cloudflare-d1-local-dev.md), [cloudflare-worker-auth.md](./cloudflare-worker-auth.md).

---

## Qué se commitea y qué no

| Commitear en git | No commitear |
|------------------|--------------|
| `[env.staging]` en `wrangler.toml` (vars no secretas, `database_name`, placeholder o `database_id` real tras crear D1) | `JWT_SECRET` de staging |
| `seed/staging_seed.sql` (datos ficticios; hash scrypt de contraseña de prueba) | `.dev.vars`, `.env`, exports con PII |
| Este runbook | Tokens, salidas de login en tickets públicos |
| Root `wrangler.toml` sin cambiar binding dev (`geriatricos_d1_dev`) | `seed/dev_seed.sql` ejecutado contra `--remote` |

**Nota:** `database_id` de D1 no es un secreto; es un identificador de recurso. Sí puede ir en `wrangler.toml` dentro de `[env.staging]` después de `wrangler d1 create`.

**`JWT_SECRET` remoto:** solo vía `wrangler secret put JWT_SECRET --env staging`. Sobrescribe cualquier var homónima heredada del entorno default en deploy staging.

---

## Prerrequisitos

- Cuenta Cloudflare con Workers + D1.
- `cd cloudflare-worker` y `npx wrangler login`.
- ETAPA 1 en repo aplicada y revisada.
- Local: `npm run typecheck` y `npm test` (42 tests) en verde.

---

## Orden de ejecución (ETAPA 2)

Todos los comandos desde `cloudflare-worker/` salvo que se indique otra ruta.

### 1. Crear D1 remota staging

```bash
cd cloudflare-worker
npx wrangler d1 create geriatricos_d1_staging
```

Anotar de la salida:

- `database_name`: debe ser `geriatricos_d1_staging`
- `database_id`: UUID

### 2. Completar `database_id` en `wrangler.toml`

En `[[env.staging.d1_databases]]`, reemplazar:

```toml
database_id = "REPLACE_WITH_STAGING_D1_DATABASE_ID"
```

por el UUID real. **No** modificar el bloque root `[[d1_databases]]` (`geriatricos_d1_dev`).

Commitear el `database_id` staging si el equipo lo permite (no es secreto).

### 3. Aplicar migraciones remotas (0001–0005)

Orden (carpeta `migrations/`):

1. `0001_initial_phase1.sql`
2. `0002_residents_frontend_align.sql`
3. `0003_clinical_phase.sql`
4. `0004_medications_phase.sql`
5. `0005_certificates.sql`

```bash
npx wrangler d1 migrations apply geriatricos_d1_staging --remote --env staging
```

Verificación:

```bash
npx wrangler d1 execute geriatricos_d1_staging --remote --env staging \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

### 4. Aplicar seed staging (solo ficticios)

**No** usar `seed/dev_seed.sql` contra remoto.

```bash
npx wrangler d1 execute geriatricos_d1_staging --remote --env staging \
  --file=seed/staging_seed.sql
```

Verificación:

```bash
npx wrangler d1 execute geriatricos_d1_staging --remote --env staging \
  --command "SELECT id, name, slug FROM facilities;"
npx wrangler d1 execute geriatricos_d1_staging --remote --env staging \
  --command "SELECT id, email, role, active_facility_id FROM users;"
npx wrangler d1 execute geriatricos_d1_staging --remote --env staging \
  --command "SELECT id, first_name, last_name FROM residents;"
```

IDs de referencia para curls:

| Recurso | ID |
|---------|-----|
| Facility | `fac-staging-001` |
| Admin user | `usr-admin-staging-001` |
| Resident | `res-staging-001` |

Credenciales de prueba (documentadas en comentarios de `staging_seed.sql`; rotar si se exponen):

- Usuario: DNI `90000001` o email `admin.staging@invalid.test`
- Contraseña: `StagingOnly2026!` (solo staging; distinta de dev local `AdminDemo123!`)

### 5. Configurar `JWT_SECRET` remoto

Generar un valor aleatorio largo (≥ 32 caracteres), distinto del `JWT_SECRET` dev del root de `wrangler.toml` y de secretos de Render/producción.

```bash
npx wrangler secret put JWT_SECRET --env staging
```

Wrangler pedirá el valor por stdin. Guardarlo en el gestor de secretos del equipo, no en el repositorio.

**No** añadir `JWT_SECRET` a `[env.staging.vars]`.

### 6. Pre-deploy checks

```bash
npm run typecheck
npm test
```

### 7. Desplegar Worker staging

```bash
npx wrangler deploy --env staging
```

Anotar la URL pública, por ejemplo:

`https://geriatricos-worker-staging.<account>.workers.dev`

```bash
export WORKER_URL="https://geriatricos-worker-staging.<account>.workers.dev"
export FACILITY_ID="fac-staging-001"
export RESIDENT_ID="res-staging-001"
```

---

## Smoke tests por curl

Sustituir credenciales y URL. Los curls no requieren CORS.

### Health

```bash
curl -s "$WORKER_URL/health"
```

Esperado: `200`, `{"ok":true,"service":"geriatricos-worker"}`.

### Auth

```bash
curl -s -X POST "$WORKER_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"90000001","password":"StagingOnly2026!"}'

export TOKEN="<access_token>"

curl -s "$WORKER_URL/auth/me" -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$WORKER_URL/auth/active-facility" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"facility_id\":\"$FACILITY_ID\"}"
```

### Facilities

```bash
curl -s "$WORKER_URL/facilities" -H "Authorization: Bearer $TOKEN"
curl -s "$WORKER_URL/facilities/$FACILITY_ID" -H "Authorization: Bearer $TOKEN"
```

### Residents

```bash
curl -s "$WORKER_URL/residents?facility_id=$FACILITY_ID" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$WORKER_URL/residents/$RESIDENT_ID" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$WORKER_URL/residents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"facility_id\":\"$FACILITY_ID\",\"first_name\":\"Smoke\",\"last_name\":\"Staging\",\"admission_date\":\"2026-01-15\"}"
```

### Contacts

```bash
curl -s "$WORKER_URL/residents/$RESIDENT_ID/contacts" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$WORKER_URL/residents/$RESIDENT_ID/contacts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Contacto Curl Staging","phone":"1199999999","is_primary":false}'
```

### Clinical

```bash
curl -s "$WORKER_URL/residents/$RESIDENT_ID/clinical-summary" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X PUT "$WORKER_URL/residents/$RESIDENT_ID/clinical-summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"main_diagnosis":"Smoke staging","allergies":"Ninguna"}'

curl -s "$WORKER_URL/residents/$RESIDENT_ID/clinical-notes" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$WORKER_URL/residents/$RESIDENT_ID/clinical-notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note_text":"Nota curl staging"}'
```

### Medications

```bash
curl -s "$WORKER_URL/residents/$RESIDENT_ID/medication-plans" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$WORKER_URL/residents/$RESIDENT_ID/medication-plans" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"med_name":"Paracetamol Staging","is_active":true}'

export PLAN_ID="<id-from-response>"

curl -s -X POST "$WORKER_URL/medication-plans/$PLAN_ID/times" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"time":"08:00","day_of_week":null}'

export TIME_ID="<id-from-response>"

curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$WORKER_URL/medication-times/$TIME_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Casos negativos

```bash
curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/auth/me"
# Esperado: 401

curl -s -X POST "$WORKER_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"90000001","password":"wrong-password"}'
# Esperado: 401
```

---

## Rollback

| Situación | Acción |
|-----------|--------|
| Staging falla o datos incorrectos | No usar `WORKER_URL` staging; **Vercel sigue en Render** — sin impacto a usuarios |
| JWT comprometido en staging | `npx wrangler secret put JWT_SECRET --env staging` con valor nuevo; volver a login |
| D1 staging corrupta | Recrear D1 o re-aplicar migraciones + `staging_seed.sql`; no afecta Render |
| Deploy malo | Rollback de deployment en dashboard Cloudflare o `wrangler deployments` |
| Abandonar staging | Ignorar URL; opcional borrar Worker env / D1 en dashboard |

**Producción:** Render permanece backend; **no** cambiar `VITE_API_BASE_URL` en Vercel hasta cumplir [cloudflare-worker-deploy-readiness.md](./cloudflare-worker-deploy-readiness.md) §7.

---

## Criterios de éxito (ETAPA 2)

- [ ] D1 `geriatricos_d1_staging` creada; `database_id` en `[env.staging]`.
- [ ] Migraciones 0001–0005 aplicadas con `--remote --env staging`.
- [ ] `staging_seed.sql` cargado; `SELECT` muestra facility, admin y residente ficticios.
- [ ] `JWT_SECRET` configurado con `wrangler secret put` (no en TOML).
- [ ] `wrangler deploy --env staging` OK.
- [ ] `/health` 200; login, `/auth/me`, residents, contacts, clinical, medications OK por curl.
- [ ] `npm test` local sigue en verde tras cambios de configuración.
- [ ] Vercel y Render sin cambios.

---

## Historial

| Bloque | Acción |
|--------|--------|
| 16 ETAPA 1 | `[env.staging]`, `staging_seed.sql`, este runbook; sin D1 remota ni deploy |
| 16 ETAPA 2 | Ejecución manual según secciones anteriores |
