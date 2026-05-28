# Cutover Render → Cloudflare (producción)

> **Histórico / cancelado para el enfoque actual (B6, 2026-05-28).**
>
> - La **migración de datos Render/PostgreSQL → D1 fue descartada**.
> - La **app médica** opera con **D1 production limpia** (bootstrap manual; sin export desde Render).
> - **Producción actual:** Vercel → Cloudflare Worker → D1. Render queda **fuera del flujo**.
>
> **Documentación vigente:**
> - Estado y alcance: [medical-app-roadmap.md](./medical-app-roadmap.md)
> - Apagar Render: [render-shutdown-checklist.md](./render-shutdown-checklist.md)
>
> El contenido debajo se conserva como **referencia histórica** del runbook de cutover clásico (incluye fases con bootstrap desde PostgreSQL, ya no aplicables).

---

Checklist y runbook para preparar **Worker production** + **D1 `geriatricos_d1_prod`** sin cambiar Vercel ni Render hasta validar el Worker. Staging remoto ya está validado (incl. certificados y `clinical-report`).

Referencias: [`cloudflare-worker/wrangler.toml`](../cloudflare-worker/wrangler.toml) (`[env.production]`), [cloudflare-worker-staging-remote.md](./cloudflare-worker-staging-remote.md), [cloudflare-worker-deploy-readiness.md](./cloudflare-worker-deploy-readiness.md).

---

## Estado actual (snapshot histórico del documento)

> **Nota:** esta tabla refleja el estado **al redactar** el runbook, no el estado operativo actual. Ver [medical-app-roadmap.md](./medical-app-roadmap.md).

| Componente | Estado (histórico) |
|------------|--------|
| Backend FastAPI (Render) | Activo — producción real (`VITE_API_BASE_URL` en Vercel apunta aquí) |
| Frontend (Vercel production) | Activo — API vía Render |
| Worker staging + D1 staging | Validados (smoke API + frontend local contra staging) |
| Worker production + D1 production | **Pendiente** — configuración en repo; ejecución manual |
| `[env.production]` en `wrangler.toml` | Placeholders `database_id` y `CORS_ORIGINS` |

**Render y Vercel production no se modifican** hasta completar Fase A y Fase B (y bootstrap de datos reales en D1) — criterio del runbook original; el equipo adoptó después **D1 limpia sin migración desde Render**.

---

## Alcance médico mínimo ya migrado (Worker)

Endpoints implementados y cubiertos por tests de contrato en `cloudflare-worker/`:

| Área | Rutas (resumen) |
|------|-----------------|
| Health | `GET /health` |
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/active-facility` |
| Facilities | `GET /facilities`, `GET /facilities/:id`, `GET /facilities/by-slug/:slug` |
| Residents | CRUD `/residents` |
| Contacts | bajo `/residents/:id/contacts` |
| Clinical | summary, notes, `GET /residents/:id/clinical-report` |
| Medications | plans bajo residente; times en `/medication-plans/:id/times`, `DELETE /medication-times/:id` |
| Certificates | `GET/POST/PATCH /certificates`, `GET /certificates/:id` |

Fuente de rutas: [`cloudflare-worker/src/index.ts`](../cloudflare-worker/src/index.ts).

---

## Fuera de alcance (no migrar en esta etapa)

No implementar ni depender del Worker para:

| Dominio | Ejemplos |
|---------|----------|
| Admin | `/admin/users`, impersonación, status de usuarios |
| Prescripciones / logs | `/patients/*/prescriptions`, `prescription_logs` |
| Staff / turnos / asistencia | `/staff*`, `/shifts*`, `/attendance*` |
| Agenda / activity / dashboard | `/agenda*`, `/activity*`, `/dashboard/summary` |
| Finanzas, push, soporte | `/finance*`, `/push*`, `/support/*` |
| Auth / residents extra | `PUT /auth/me`, papelera, upload documento, `clinical-history.pdf` |

Detalle ampliado: [cloudflare-worker-deploy-readiness.md](./cloudflare-worker-deploy-readiness.md) §2–3.

**Advertencia:** si Vercel apunta al Worker antes de migrar estos módulos, las pantallas que los usan fallarán hasta volver a Render o implementarlos en el Worker.

---

## Advertencias críticas

### No usar seeds de desarrollo/staging en producción

| Archivo | Uso permitido |
|---------|----------------|
| `seed/dev_seed.sql` | Solo D1 **local** (`geriatricos_d1_dev`) |
| `seed/staging_seed.sql` | Solo D1 **staging** (`geriatricos_d1_staging`) |

**No ejecutar** `dev_seed.sql` ni `staging_seed.sql` contra `geriatricos_d1_prod`. Contienen datos ficticios y credenciales de prueba.

### D1 production limpia requiere bootstrap real

Tras aplicar migraciones 0001–0005, la D1 production estará **vacía** (solo esquema). Antes de cambiar `VITE_API_BASE_URL` en Vercel:

- Cargar al menos: `facilities`, `users` (admin operativo), `facility_users`, y datos mínimos de `residents` si se va a operar.
- Estrategia: export/migración controlada desde PostgreSQL (Render) o scripts SQL operativos acordados por el equipo — **fuera de este repo**.
- Sin bootstrap, login y flujos médicos en producción **no funcionarán**.

### Superusuario de prueba en D1 production (opcional)

Para probar la app sin credenciales del médico, usar el script del repo (no ejecuta D1; genera SQL local):

1. Consultar `facility_id` real en D1 prod (comandos en § Comandos PowerShell del doc o Fase A).
2. Desde `cloudflare-worker/`, definir `SUPERUSER_EMAIL`, `SUPERUSER_PASSWORD`, `SUPERUSER_FACILITY_ID` (opcionales: `SUPERUSER_FULL_NAME`, `SUPERUSER_DNI`, `SUPERUSER_USER_ID`).
3. `npx tsx scripts/create-production-superuser.mjs` → crea `superuser-production-insert.sql` (ignorado por git).
4. Aplicar con `wrangler d1 execute geriatricos_d1_prod --remote --env production --file superuser-production-insert.sql`.

Rol: `users.role = platform_admin`, `facility_users.role = admin`. Login Worker: `{ "username": "<email o dni>", "password": "..." }` → respuesta `access_token`.

---

## Fases del cutover

### Fase A — Crear D1 production y configurar Worker production

**Sin tocar Vercel ni Render.**

Checklist:

- [ ] `npx wrangler login`
- [ ] `npx wrangler d1 create geriatricos_d1_prod` — anotar `database_id`
- [ ] Reemplazar `REPLACE_WITH_PRODUCTION_D1_DATABASE_ID` en `[[env.production.d1_databases]]` de `wrangler.toml`
- [ ] Aplicar migraciones 0001–0005 remotas (`--env production`)
- [ ] **Bootstrap datos reales** en D1 (ver advertencias arriba)
- [ ] Obtener URL exacta de Vercel production (sin barra final) → reemplazar `REPLACE_WITH_VERCEL_PRODUCTION_ORIGIN` en `CORS_ORIGINS`
- [ ] `npx wrangler secret put JWT_SECRET --env production` (valor único, ≥ 32 caracteres; no commitear)
- [ ] `npm run typecheck` y `npm test` en verde
- [ ] `npx wrangler deploy --env production` — anotar URL pública del Worker

Migraciones (orden en `cloudflare-worker/migrations/`):

1. `0001_initial_phase1.sql`
2. `0002_residents_frontend_align.sql`
3. `0003_clinical_phase.sql`
4. `0004_medications_phase.sql`
5. `0005_certificates.sql`

---

### Fase B — Smoke API contra Worker production

Validar con `curl` o PowerShell (no requiere CORS). Usar credenciales y IDs del **bootstrap real**, no los de staging.

Checklist:

- [ ] `GET /health` → 200
- [ ] Login, `/auth/me`, `POST /auth/active-facility`
- [ ] Facilities y residents de una sede real
- [ ] Contacts, clinical summary/notes, `GET .../clinical-report`
- [ ] Medication plans/times (crear y borrar un time de prueba si aplica)
- [ ] Certificates (list/create/get según datos cargados)
- [ ] Casos negativos: `/auth/me` sin token → 401

Ver sección [Smoke tests mínimos](#smoke-tests-mínimos).

---

### Fase C — Prueba frontend local contra Worker production

**Opcional pero recomendado** antes de Fase D.

En `frontend/.env.local` (no commitear):

```env
VITE_API_BASE_URL=https://geriatricos-worker-production.<account>.workers.dev
```

- [ ] `npm run dev` en `frontend/`
- [ ] Login con usuario real del bootstrap
- [ ] Flujos médicos mínimos: sede activa → residentes → clínica → medicación → certificados
- [ ] No probar rutas fuera de alcance (staff, finanzas, recetas históricas, admin)

Vercel production **sigue** apuntando a Render durante esta fase.

---

### Fase D — Cambio `VITE_API_BASE_URL` en Vercel

Solo cuando Fase A, B y bootstrap estén OK.

1. Vercel → proyecto frontend → **Settings → Environment Variables** (Production).
2. `VITE_API_BASE_URL` = URL del Worker production (misma que Fase B).
3. **Redeploy** de production (variables se embeben en build).
4. Smoke visual en el dominio Vercel real (ver abajo).

Rollback inmediato si falla: Fase E.

---

### Fase E — Ventana de rollback (24–48 h)

- [ ] **Render permanece activo** con la misma base de datos PostgreSQL.
- [ ] Anotar hora de cutover y responsable.
- [ ] Si hay incidencia: revertir `VITE_API_BASE_URL` a Render + redeploy Vercel (ver [Rollback](#rollback)).
- [ ] Monitorear errores en DevTools (Network) y logs del Worker en dashboard Cloudflare.

URL Render documentada en el equipo (ej. docs): `https://geriatricos-proyecto.onrender.com` — confirmar la URL vigente en el dashboard de Render.

---

### Fase F — Baja de Render

Solo tras cumplir [criterios conservadores](#criterios-conservadores-para-apagar-render) y aprobación operativa.

---

## Comandos PowerShell

Ejecutar desde la raíz del repo. Ajustar rutas si es necesario.

```powershell
Set-Location cloudflare-worker
```

### Prerrequisitos

```powershell
npx wrangler login
npm run typecheck
npm test
```

### Crear D1 production

```powershell
npx wrangler d1 create geriatricos_d1_prod
```

Copiar el `database_id` de la salida en `wrangler.toml` → `[[env.production.d1_databases]]`.

### Aplicar migraciones (0001–0005)

```powershell
npx wrangler d1 migrations apply geriatricos_d1_prod --remote --env production
```

Verificar tablas:

```powershell
npx wrangler d1 execute geriatricos_d1_prod --remote --env production `
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

### JWT secret production

```powershell
npx wrangler secret put JWT_SECRET --env production
```

Wrangler pedirá el valor por stdin. Guardarlo en el gestor de secretos del equipo.

### Deploy Worker production

Completar antes `CORS_ORIGINS` con el dominio Vercel production real.

```powershell
npx wrangler deploy --env production
```

Anotar la URL publicada, por ejemplo:

`https://geriatricos-worker-production.<account>.workers.dev`

### Variables para smoke (PowerShell)

```powershell
$env:WORKER_URL = "https://geriatricos-worker-production.<account>.workers.dev"
$env:FACILITY_ID = "<facility-id-from-bootstrap>"
$env:RESIDENT_ID = "<resident-id-from-bootstrap>"
```

---

## Smoke tests mínimos

Sustituir credenciales reales del bootstrap. En PowerShell puede usarse `curl.exe` (Windows 10+) o `Invoke-RestMethod`.

### Health

```powershell
curl.exe -s "$env:WORKER_URL/health"
```

Esperado: `200`, `{"ok":true,"service":"geriatricos-worker"}`.

### Auth

```powershell
curl.exe -s -X POST "$env:WORKER_URL/auth/login" `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"<dni-o-email>\",\"password\":\"<password>\"}'
```

Guardar token:

```powershell
$env:TOKEN = "<access_token>"
```

```powershell
curl.exe -s "$env:WORKER_URL/auth/me" -H "Authorization: Bearer $env:TOKEN"

curl.exe -s -X POST "$env:WORKER_URL/auth/active-facility" `
  -H "Authorization: Bearer $env:TOKEN" `
  -H "Content-Type: application/json" `
  -d "{`\"facility_id`\":`"$env:FACILITY_ID`\"}"
```

### Facilities y residents

```powershell
curl.exe -s "$env:WORKER_URL/facilities" -H "Authorization: Bearer $env:TOKEN"
curl.exe -s "$env:WORKER_URL/residents?facility_id=$env:FACILITY_ID" -H "Authorization: Bearer $env:TOKEN"
curl.exe -s "$env:WORKER_URL/residents/$env:RESIDENT_ID" -H "Authorization: Bearer $env:TOKEN"
```

### Contacts y clinical

```powershell
curl.exe -s "$env:WORKER_URL/residents/$env:RESIDENT_ID/contacts" -H "Authorization: Bearer $env:TOKEN"
curl.exe -s "$env:WORKER_URL/residents/$env:RESIDENT_ID/clinical-summary" -H "Authorization: Bearer $env:TOKEN"
curl.exe -s "$env:WORKER_URL/residents/$env:RESIDENT_ID/clinical-notes" -H "Authorization: Bearer $env:TOKEN"
curl.exe -s "$env:WORKER_URL/residents/$env:RESIDENT_ID/clinical-report" -H "Authorization: Bearer $env:TOKEN"
```

### Medications

```powershell
curl.exe -s "$env:WORKER_URL/residents/$env:RESIDENT_ID/medication-plans" -H "Authorization: Bearer $env:TOKEN"
```

### Certificates

```powershell
curl.exe -s "$env:WORKER_URL/certificates?resident_id=$env:RESIDENT_ID" -H "Authorization: Bearer $env:TOKEN"
```

### Casos negativos

```powershell
curl.exe -s -o NUL -w "%{http_code}" "$env:WORKER_URL/auth/me"
# Esperado: 401
```

### Smoke visual (tras Fase D)

En el navegador con la app Vercel production:

1. DevTools → Network: peticiones van a la URL del Worker, no a Render.
2. Login, selección de sede, abrir ficha de residente, clínica, medicación, certificados.
3. Confirmar que no hay errores CORS en consola.

---

## Rollback

| Situación | Acción |
|-----------|--------|
| Worker production falla tras cutover Vercel | Vercel: `VITE_API_BASE_URL` = URL Render → **Redeploy** production |
| CORS bloquea el browser | Corregir `CORS_ORIGINS` en `[env.production.vars]`, redeploy Worker |
| JWT comprometido | `npx wrangler secret put JWT_SECRET --env production` con valor nuevo; usuarios deben volver a login |
| Datos incorrectos en D1 prod | No usar staging seed; restaurar desde backup/bootstrap planificado |
| Deploy Worker malo | Rollback de deployment en dashboard Cloudflare |

Render debe seguir respondiendo durante la ventana 24–48 h si no se ha dado de baja el servicio.

---

## Criterios conservadores para apagar Render

Todas deben ser verdaderas (alineado con [cloudflare-worker-deploy-readiness.md](./cloudflare-worker-deploy-readiness.md) §8):

- [ ] Fases A–D completadas; smoke API y visual OK.
- [ ] Bootstrap production validado con usuarios reales.
- [ ] Ventana 24–48 h sin incidencias críticas en auth, residents, clinical, medications, certificates.
- [ ] Rollback Vercel → Render **probado** al menos una vez en preview o documentado con responsable.
- [ ] Endpoints **bloqueantes** para el negocio migrados o explícitamente aceptados como no disponibles (staff, shifts, attendance, agenda, activity, `PUT /auth/me`, finanzas, recetas, admin).
- [ ] Monitoreo básico del Worker (errores, latencia) activo.
- [ ] Aprobación operativa explícita (no solo técnica).

Si solo se migró el **alcance médico mínimo**, apagar Render dejará de atender los módulos fuera de alcance. No apagar Render hasta que el equipo acepte esa degradación o complete las fases restantes del [backend-migration-checklist.md](./backend-migration-checklist.md).

---

## Datos pendientes de completar (operador)

| Dato | Dónde obtenerlo |
|------|-----------------|
| `database_id` production | Salida de `wrangler d1 create geriatricos_d1_prod` → `wrangler.toml` |
| Dominio Vercel production | Vercel → Project → Domains (Production), sin `/` final → `CORS_ORIGINS` |
| URL Worker production | Salida de `wrangler deploy --env production` → smoke y `VITE_API_BASE_URL` |
| `JWT_SECRET` production | Generado por el equipo → `wrangler secret put` |
| Estrategia bootstrap real | Export/migración desde Render PostgreSQL o SQL operativo acordado |

---

## Historial

| Etapa | Acción |
|-------|--------|
| 6 (repo) | `[env.production]`, este checklist; sin D1 remota prod ni deploy |
| 6 (manual) | Fases A–F según secciones anteriores |
| B6 (2026-05-28) | Documento marcado histórico; migración Render→D1 descartada; ver [medical-app-roadmap.md](./medical-app-roadmap.md) y [render-shutdown-checklist.md](./render-shutdown-checklist.md) |
