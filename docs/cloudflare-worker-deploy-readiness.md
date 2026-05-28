# Cloudflare Worker — Deploy readiness (Bloque 15)

Revisión técnica previa a desplegar el Worker en Cloudflare con D1 remota. **Solo documentación:** no implica deploy, creación de D1 remota, cambios en Vercel/Render, frontend ni FastAPI.

**Fecha de revisión:** 2026-05-28  
**Estado local verificado:** Worker + D1 local/dev operativos; **42 tests** de contrato en `cloudflare-worker/` (`npm test`).

---

## Conclusión ejecutiva

| Pregunta | Respuesta |
|----------|-----------|
| ¿Listo para **staging remoto** y smoke tests del MVP clínico/residentes? | **Sí.** Auth, sede activa, facilities, residents, contacts, clinical y medication plans/times están implementados y cubiertos por tests de contrato. |
| ¿Listo para **apagar Render** de forma conservadora? | **No.** Faltan endpoints bloqueantes (staff, shifts, attendance, agenda, activity; y otros usados por flujos OWNER/médico). |
| ¿Qué hacer con Render y Vercel ahora? | **Render** sigue como backend de producción. **Vercel** sigue con `VITE_API_BASE_URL` apuntando a Render. El Worker remoto se valida por `curl` antes de cualquier cutover. |

---

## Contexto operativo actual

| Componente | Estado |
|--------------|--------|
| Frontend (Vercel) | Activo; API vía `VITE_API_BASE_URL` → Render |
| Backend FastAPI (Render) | Activo; fuente de verdad en producción |
| Worker local | Funcional (`npm run dev`, D1 local) |
| D1 remota staging | **No creada** hasta ETAPA 2 ([runbook staging](./cloudflare-worker-staging-remote.md)) |
| Worker remoto staging | **No desplegado** hasta ETAPA 2; repo listo con `[env.staging]` |

Referencias: [backend-migration-inventory.md](./backend-migration-inventory.md), [backend-migration-checklist.md](./backend-migration-checklist.md), docs `cloudflare-worker-*.md`, [cloudflare-d1-local-dev.md](./cloudflare-d1-local-dev.md).

---

## 1. Endpoints implementados en el Worker

Fuente: [`cloudflare-worker/src/index.ts`](../cloudflare-worker/src/index.ts) y módulos en `src/modules/`. Contratos y tests: [cloudflare-worker-testing.md](./cloudflare-worker-testing.md).

### 1.1 Health

| Método | Ruta | Auth | Módulo | Frontend API | Tests |
|--------|------|------|--------|--------------|-------|
| GET | `/health` | No | `index.ts` | — | Manual (smoke) |

### 1.2 Auth

| Método | Ruta | Auth | Módulo | Frontend API | Tests |
|--------|------|------|--------|--------------|-------|
| POST | `/auth/login` | No | `modules/auth` | `frontend/src/api/auth.ts` | 2 casos |
| GET | `/auth/me` | Bearer | `modules/auth` | `auth.ts` | 2 casos |
| POST | `/auth/active-facility` | Bearer | `modules/auth` | `auth.ts` | 4 casos |

### 1.3 Facilities

| Método | Ruta | Auth | Módulo | Frontend API | Tests |
|--------|------|------|--------|--------------|-------|
| GET | `/facilities` | Bearer | `modules/facilities` | `frontend/src/api/facilities.ts` | 2 casos |
| GET | `/facilities/:facilityId` | Bearer | `modules/facilities` | `facilities.ts` | 1 caso |
| GET | `/facilities/by-slug/:slug` | Bearer | `modules/facilities` | `facilities.ts` | 1 caso |

### 1.4 Residents

| Método | Ruta | Auth | Módulo | Frontend API | Tests |
|--------|------|------|--------|--------------|-------|
| GET | `/residents` | Bearer | `modules/residents` | `frontend/src/api/residents.ts` | 2 casos |
| GET | `/residents/:residentId` | Bearer | `modules/residents` | `residents.ts` | 1 caso |
| POST | `/residents` | Bearer | `modules/residents` | `residents.ts` | 2 casos |
| PATCH | `/residents/:residentId` | Bearer | `modules/residents` | `residents.ts` | 1 caso |
| DELETE | `/residents/:residentId` | Bearer | `modules/residents` | `residents.ts` | 1 caso |

### 1.5 Resident contacts

Montado bajo `/residents/:residentId/contacts` ([`modules/contacts`](../cloudflare-worker/src/modules/contacts/index.ts)).

| Método | Ruta | Auth | Frontend API | Tests |
|--------|------|------|--------------|-------|
| GET | `/residents/:residentId/contacts` | Bearer | `frontend/src/api/contacts.ts` | 3 casos |
| POST | `/residents/:residentId/contacts` | Bearer | `contacts.ts` | 1 caso |
| PATCH | `/residents/:residentId/contacts/:contactId` | Bearer | `contacts.ts` | 1 caso |
| DELETE | `/residents/:residentId/contacts/:contactId` | Bearer | `contacts.ts` | 1 caso |

### 1.6 Clinical (summary / notes)

Montado bajo `/residents/:residentId` ([`modules/clinical`](../cloudflare-worker/src/modules/clinical/index.ts)).

| Método | Ruta | Auth | Frontend API | Tests |
|--------|------|------|--------------|-------|
| GET | `/residents/:residentId/clinical-summary` | Bearer | `frontend/src/api/clinical.ts` | 3 casos |
| PUT | `/residents/:residentId/clinical-summary` | Bearer | `clinical.ts` | 1 caso |
| GET | `/residents/:residentId/clinical-notes` | Bearer | `clinical.ts` | 2 casos |
| POST | `/residents/:residentId/clinical-notes` | Bearer | `clinical.ts` | 1 caso |

### 1.7 Medication plans / times

| Método | Ruta | Auth | Módulo | Frontend API | Tests |
|--------|------|------|--------|--------------|-------|
| GET | `/residents/:residentId/medication-plans` | Bearer | `modules/medications` | `frontend/src/api/medications.ts` | 3 casos |
| POST | `/residents/:residentId/medication-plans` | Bearer | `medications` | `medications.ts` | 2 casos |
| POST | `/medication-plans/:planId/times` | Bearer | `medications/plan-routes` | `medications.ts` | 2 casos |
| DELETE | `/medication-times/:timeId` | Bearer | `medications/time-routes` | `medications.ts` | 2 casos |

**Total aproximado:** 22 handlers HTTP (+ `/health`), **42** assertions en tests de contrato.

---

## 2. Endpoints pendientes (frontend los define; Worker no)

Inventario derivado de [backend-migration-inventory.md](./backend-migration-inventory.md) y consumo real en `frontend/src/api/` + páginas.

### 2.1 Auth / admin

| Método | Ruta | Prioridad inventory | Uso UI actual | Notas |
|--------|------|---------------------|---------------|-------|
| PUT | `/auth/me` | MVP | **Sí** — `MyAccountPage` | Edición de perfil |
| POST | `/auth/register` | MVP | Ruta `/register` redirige a login | API definida |
| POST | `/auth/verify-email` | después | Redirect a login | — |
| POST | `/auth/resend-verification` | después | Formulario reenvío | — |
| POST | `/auth/password-reset/request` | después | Login, My Account | — |
| POST | `/auth/password-reset/confirm` | después | Reset password page | — |
| GET | `/admin/users` | después | `AdminUsersPage` | Solo admin |
| POST | `/admin/impersonate` | después | `AuthContext` | — |
| POST | `/admin/impersonate/stop` | después | `AuthContext` | — |
| PATCH | `/admin/users/:userId/status` | después | `AdminUsersPage` | — |

### 2.2 Residents / documentos / papelera

| Método | Ruta | Uso UI actual | Notas |
|--------|------|---------------|-------|
| GET | `/residents/deleted` | **Sí** — `ResidentsTrashPage` | Papelera |
| POST | `/residents/:id/restore` | **Sí** — `ResidentsTrashPage` | — |
| POST | `/residents/:id/document` | **Sí** — `ResidentForm` (multipart) | Upload documento |

### 2.3 Clinical PDF

| Método | Ruta | Uso UI actual | Notas |
|--------|------|---------------|-------|
| GET | `/residents/:id/clinical-history.pdf` | **Sí** — `ClinicalHistoryPage` | Generación PDF |

### 2.4 Medications pendientes

| Método | Ruta | Uso UI actual | Notas |
|--------|------|---------------|-------|
| PATCH | `/medication-plans/:planId` | **No** | Solo en `medications.ts` |
| POST | `/residents/:id/medication-administrations` | **No** | API definida |
| GET | `/residents/:id/medication-administrations` | **No** | API definida |
| GET | `/facilities/:id/medication-due` | **No** | Ruta `/medication-due` redirige a medical-guide |

### 2.5 Staff

| Método | Ruta | Uso UI actual |
|--------|------|---------------|
| GET | `/staff` | **Sí** — staff, attendance, shifts |
| GET | `/staff/:staffId` | **Sí** |
| POST | `/staff` | **Sí** |
| PATCH | `/staff/:staffId` | **Sí** |
| POST | `/staff/:staffId/transfer` | Parcial (API; flujo secundario) |
| GET | `/staff/:staffId/report` | **Sí** — `StaffPrintPage` |

### 2.6 Shifts

| Método | Ruta | Uso UI actual |
|--------|------|---------------|
| GET/POST/PATCH/DELETE | `/shifts`, `/shifts/:id` | **Sí** — gestión de turnos |
| GET/POST/PATCH/DELETE | `/shifts/assignments*` | **Sí** — `ShiftAssignmentsPage` |
| POST | `/shifts/assignments/bulk` | Secundario |
| GET | `/shifts/dashboard/:facilityId` | **Sí** — `CurrentlyWorkingPage` |
| GET | `/shifts/currently-working/:facilityId` | Secundario |

### 2.7 Attendance

| Método | Ruta | Uso UI actual |
|--------|------|---------------|
| GET | `/attendance` | **Sí** — `AttendancePage` |
| POST | `/attendance` | **Sí** |
| POST | `/attendance/:id/check-out` | **Sí** |
| GET | `/attendance/report` | **Sí** (reporte) |

### 2.8 Agenda

| Método | Ruta | Uso UI actual |
|--------|------|---------------|
| GET | `/agenda/today` | **Sí** — `AgendaToday` en `GeriatricMedicalPage` |
| POST | `/agenda` | **Sí** |
| PATCH | `/agenda/:entryId` | **Sí** |
| DELETE | `/agenda/:entryId` | API definida (UI parcial) |

### 2.9 Dashboard / activity

| Método | Ruta | Uso UI actual | Notas |
|--------|------|---------------|-------|
| GET | `/dashboard/summary` | **Sí** — `GeriatricMedicalPage` | Frontend tolera 404/500 → `null` |
| GET | `/activity` | **Sí** — widget y `ActivityFeedPage` | Error visible si falla |
| GET/POST/DELETE | `/activity/saved`, save/unsave | **Sí** — feed avanzado | Fase 5 inventory |

### 2.10 Finance / certificates / push / support / otros

| Dominio | Rutas (resumen) | Uso UI |
|---------|-----------------|--------|
| Finance | `/finance/categories`, transactions, summary | **Sí** — `FinancePage` (OWNER) |
| Certificates | `/certificates*` | **Sí** — certificados |
| Push | `/push/*` | Config PWA |
| Support | `/support/bug-report` | Soporte |
| Prescriptions | `/patients/:id/prescriptions` | Historial recetas |

Detalle completo: [backend-migration-inventory.md](./backend-migration-inventory.md) §1 y §7 (postergables).

---

## 3. Clasificación: bloqueantes vs pueden esperar vs no usados por UI

### 3.1 Bloquean apagar Render (implementar + validar E2E desde Vercel)

Según [backend-migration-checklist.md](./backend-migration-checklist.md) §8–9 y uso real del frontend:

| Grupo | Endpoints clave | Motivo |
|-------|-----------------|--------|
| **Staff** | CRUD `/staff*` | Flujo OWNER diario (`StaffManagementPage`, attendance, shifts) |
| **Shifts** | `/shifts*`, `/shifts/assignments*` | Turnos y asignaciones |
| **Attendance** | `/attendance`, check-out, report | Control de asistencia |
| **Agenda** | `/agenda/today`, POST, PATCH | Vista médica (`GeriatricMedicalPage`) |
| **Activity** | `GET /activity` | Widget en dashboard médico y feed |
| **Auth perfil** | `PUT /auth/me` | Cuenta de usuario en producción |

Además, para corte conservador:

| Requisito | Estado |
|-----------|--------|
| Validación E2E Vercel → Worker remoto | Pendiente |
| Fases 3–4 del checklist completas en Worker | Pendiente |
| Operación real en ventana controlada sin Render | Pendiente |

### 3.2 Pueden esperar (no bloquean corte conservador inmediato)

| Grupo | Ejemplos | Notas |
|-------|----------|-------|
| Admin avanzado | `/admin/*`, impersonación | Uso acotado a platform admin |
| Auth secundario | register, verify-email, password-reset | Rutas públicas redirigen o son poco frecuentes |
| Residents papelera/docs | deleted, restore, document upload | Importante pero no en flujo mínimo diario de todos los roles |
| Clinical PDF | `clinical-history.pdf` | reportlab / complejidad |
| Dashboard summary | `/dashboard/summary` | Degradación graceful en frontend |
| Medications extra | administrations, medication-due, PATCH plan | Sin consumo UI actual |
| Fase 5 | finance, certificates, push, support, prescriptions, activity saved | Inventory §7 |

### 3.3 Pendientes no usados por la UI actual

| Endpoint | Dónde está definido |
|----------|---------------------|
| `PATCH /medication-plans/:planId` | `frontend/src/api/medications.ts` |
| `POST/GET .../medication-administrations` | `medications.ts` |
| `GET /facilities/:id/medication-due` | `medications.ts` (ruta UI redirige) |
| Varios secundarios de shifts (`bulk`, `currently-working`) | `shifts.ts` |

---

## 4. Configuración remota: variables y `wrangler.toml`

Archivo revisado: [`cloudflare-worker/wrangler.toml`](../cloudflare-worker/wrangler.toml). **No completar `database_id` real ni commitear secretos en este bloque.**

| Clave | Tipo | Local (repo) | Remoto / staging (recomendación) |
|-------|------|--------------|----------------------------------|
| `CORS_ORIGINS` | `[vars]` | `localhost:5173`, `127.0.0.1:5173` | Lista separada por comas con URL(s) Vercel **cuando** se evalúe cutover. Para smoke con `curl` no es obligatorio. |
| `ENVIRONMENT` | `[vars]` | `development` | `staging` o `production` |
| `JWT_SECRET` | **Secreto** | Valor dev en `[vars]` (solo local) | `npx wrangler secret put JWT_SECRET` — **no** dejar el valor dev en deploy remoto |
| `JWT_EXPIRES_IN_SECONDS` | `[vars]` | `28800` (8 h) | Definir TTL operativo |
| `DB` | D1 binding | `binding = "DB"` | Igual |
| `database_name` | D1 | `geriatricos_d1_dev` | Considerar nombre distinto para remoto (ej. `geriatricos_d1_staging`) |
| `database_id` | D1 | `REPLACE_WITH_REAL_D1_DATABASE_ID` | Copiar **solo** tras `wrangler d1 create`; no inventar UUID |

### Placeholders y gaps documentados

- `database_id = "REPLACE_WITH_REAL_D1_DATABASE_ID"` — único bloqueo de binding D1 remoto en repo.
- No hay bloques `[env.staging]` / `[env.production]` — un solo `wrangler.toml`; separar entornos es decisión futura.
- `JWT_SECRET` en `[vars]` es explícitamente **dev-only**; advertencia en comentarios del archivo.

Tipos: [`cloudflare-worker/src/types/env.ts`](../cloudflare-worker/src/types/env.ts).

---

## 5. Runbook futuro (no ejecutar en Bloque 15)

Todos los comandos desde `cloudflare-worker/`. Sustituir `<DATABASE_NAME>` y `$WORKER_URL` por valores reales tras crear recursos.

### 5.1 Crear D1 remota

```bash
cd cloudflare-worker
npx wrangler d1 create geriatricos_d1_staging
```

- Anotar el `database_id` que devuelve Wrangler.
- Actualizar **localmente** (o en rama de deploy) `wrangler.toml`: `database_name` y `database_id`.
- **No** commitear secretos; política de equipo para si el `database_id` va al repo.

### 5.2 Aplicar migraciones remotas

Migraciones existentes (orden):

1. `migrations/0001_initial_phase1.sql`
2. `migrations/0002_residents_frontend_align.sql`
3. `migrations/0003_clinical_phase.sql`
4. `migrations/0004_medications_phase.sql`

```bash
npx wrangler d1 migrations apply <DATABASE_NAME> --remote
```

### 5.3 Seed / admin inicial remoto (SQL mínimo)

**Principios:**

- Sin datos personales reales.
- No copiar `seed/dev_seed.sql` a producción tal cual (IDs `*-demo-*`, email ficticio).
- Residentes reales: carga manual después del login en UI o SQL controlado.

**Contenido mínimo del bootstrap SQL:**

1. Una o más filas en `facilities` (`id`, `name`, `slug`, `is_active`).
2. Un usuario admin en `users` con `password_hash` scrypt válido (mismo formato que [`src/modules/auth/password.ts`](../cloudflare-worker/src/modules/auth/password.ts)).
3. Filas en `facility_users` ligando admin ↔ cada sede.
4. `active_facility_id` del admin apuntando a sede por defecto.

**Staging opcional:** se puede adaptar estructura de [`seed/dev_seed.sql`](../cloudflare-worker/seed/dev_seed.sql) con IDs distintos y credenciales de prueba rotadas; nunca reutilizar contraseñas de producción.

Ejemplo de carga (cuando exista `seed/remote_bootstrap.sql` o SQL preparado):

```bash
npx wrangler d1 execute <DATABASE_NAME> --remote --file=seed/remote_bootstrap.sql
```

Verificación:

```bash
npx wrangler d1 execute <DATABASE_NAME> --remote --command "SELECT id, name, slug FROM facilities;"
npx wrangler d1 execute <DATABASE_NAME> --remote --command "SELECT id, email, role, active_facility_id FROM users;"
```

### 5.4 Configurar secretos

```bash
npx wrangler secret put JWT_SECRET
```

Revisar que `ENVIRONMENT` y `CORS_ORIGINS` en `[vars]` del entorno remoto sean coherentes antes del deploy.

### 5.5 Desplegar Worker

```bash
npm run typecheck
npm test
npx wrangler deploy
```

Anotar la URL pública (`https://<name>.<account>.workers.dev`).

### 5.6 Probar Worker remoto (sin tocar Vercel)

Ejecutar la sección [6. Smoke tests manuales](#6-smoke-tests-manuales-contra-worker-remoto) contra `$WORKER_URL`.

Opcional para el operador (sin commit): frontend local con `VITE_API_BASE_URL=$WORKER_URL` en `.env.local` — fuera de alcance de este bloque.

### 5.7 Recién después: evaluar Vercel

Ver [§7 Criterios para cambiar `VITE_API_BASE_URL`](#7-criterios-para-cambiar-vite_api_base_url-en-vercel). Render permanece activo hasta completar [§8](#8-criterios-para-dar-de-baja-render).

---

## 6. Smoke tests manuales contra Worker remoto

Variables de entorno de shell (ejemplo):

```bash
export WORKER_URL="https://geriatricos-worker.<account>.workers.dev"
export FACILITY_ID="<id-de-facility-en-d1>"
```

### 6.1 Health

```bash
curl -s "$WORKER_URL/health"
```

Esperado: `200`, `{"ok":true,"service":"geriatricos-worker"}`.

### 6.2 Auth

```bash
# Login
curl -s -X POST "$WORKER_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"<dni-o-email>","password":"<password>"}'

export TOKEN="<access_token>"

# Me
curl -s "$WORKER_URL/auth/me" -H "Authorization: Bearer $TOKEN"

# Active facility
curl -s -X POST "$WORKER_URL/auth/active-facility" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"facility_id\":\"$FACILITY_ID\"}"
```

Esperado: login `200` + `access_token`; me `200` con usuario; active-facility `200` con `active_facility_id`.

### 6.3 Facilities

```bash
curl -s "$WORKER_URL/facilities" -H "Authorization: Bearer $TOKEN"
curl -s "$WORKER_URL/facilities/$FACILITY_ID" -H "Authorization: Bearer $TOKEN"
```

### 6.4 Residents (CRUD mínimo)

```bash
# List
curl -s "$WORKER_URL/residents?facility_id=$FACILITY_ID" -H "Authorization: Bearer $TOKEN"

# Create
curl -s -X POST "$WORKER_URL/residents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"facility_id\":\"$FACILITY_ID\",\"first_name\":\"Test\",\"last_name\":\"Remoto\",\"admission_date\":\"2026-01-15\"}"

export RESIDENT_ID="<id-del-create>"

# Get / Patch / Delete
curl -s "$WORKER_URL/residents/$RESIDENT_ID" -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH "$WORKER_URL/residents/$RESIDENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"smoke-patch"}'
curl -s -o /dev/null -w "%{http_code}" -X DELETE "$WORKER_URL/residents/$RESIDENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Esperado: create `201`; patch `200`; delete `204`; get posterior `404` si soft-delete.

### 6.5 Contacts

Usar un `RESIDENT_ID` existente en D1 (creado en smoke o en seed staging).

```bash
curl -s "$WORKER_URL/residents/$RESIDENT_ID/contacts" -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$WORKER_URL/residents/$RESIDENT_ID/contacts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Contacto Smoke","phone":"1100000000","is_primary":true}'

export CONTACT_ID="<id>"

curl -s -X PATCH "$WORKER_URL/residents/$RESIDENT_ID/contacts/$CONTACT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"1100000001"}'

curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$WORKER_URL/residents/$RESIDENT_ID/contacts/$CONTACT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 6.6 Clinical

```bash
curl -s "$WORKER_URL/residents/$RESIDENT_ID/clinical-summary" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X PUT "$WORKER_URL/residents/$RESIDENT_ID/clinical-summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"main_diagnosis":"Smoke test","allergies":"Ninguna"}'

curl -s "$WORKER_URL/residents/$RESIDENT_ID/clinical-notes" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$WORKER_URL/residents/$RESIDENT_ID/clinical-notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note_text":"Nota smoke remoto"}'
```

### 6.7 Medication plans / times

```bash
curl -s "$WORKER_URL/residents/$RESIDENT_ID/medication-plans" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$WORKER_URL/residents/$RESIDENT_ID/medication-plans" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"med_name":"Paracetamol","is_active":true}'

export PLAN_ID="<id>"

curl -s -X POST "$WORKER_URL/medication-plans/$PLAN_ID/times" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"time":"08:00","day_of_week":null}'

export TIME_ID="<id>"

curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$WORKER_URL/medication-times/$TIME_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 6.8 Casos negativos recomendados

| Caso | Esperado |
|------|----------|
| `GET /auth/me` sin token | `401`, `Not authenticated` |
| Login credenciales inválidas | `401` |
| `active-facility` con sede sin membership | `403` |
| Residente inexistente | `404` |

Alineado con [cloudflare-worker-testing.md](./cloudflare-worker-testing.md).

---

## 7. Criterios para cambiar `VITE_API_BASE_URL` en Vercel

Todas deben cumplirse antes de apuntar producción o preview estable al Worker:

- [ ] Smoke tests de [§6](#6-smoke-tests-manuales-contra-worker-remoto) exitosos contra URL remota del Worker.
- [ ] `npm test` en `cloudflare-worker/` en verde (42 tests) en CI o máquina del operador.
- [ ] `CORS_ORIGINS` en Worker remoto incluye dominio(s) Vercel usados (producción y/o preview).
- [ ] D1 remota con al menos un admin operativo y facilities cargadas (no vacía).
- [ ] `JWT_SECRET` remoto configurado vía `wrangler secret put` — distinto del valor dev del repo.
- [ ] **Render sigue activo** como rollback.
- [ ] Plan de rollback probado: revertir `VITE_API_BASE_URL` a URL Render + redeploy Vercel.
- [ ] Prueba controlada en preview de Vercel antes de producción (recomendado).

**No cambiar Vercel en Bloque 15.**

---

## 8. Criterios para dar de baja Render

Condiciones conservadoras (todas requeridas):

- [ ] **Endpoints bloqueantes implementados** en Worker: staff, shifts, attendance, agenda, activity; `PUT /auth/me`; y los que el equipo defina como críticos para OWNER/médico en prod.
- [ ] **Validación E2E desde Vercel** contra Worker (flujos login → sede → residentes → clínica → medicación → staff/asistencia/agenda según roles).
- [ ] Fases 1–4 del [backend-migration-checklist.md](./backend-migration-checklist.md) completadas y marcadas en checklist.
- [ ] **Operación real** en ventana controlada sin depender de Render.
- [ ] Incidencias críticas en auth, residents, medications, staff/attendance: **0 abiertas**.
- [ ] Monitoreo básico del Worker (errores, latencia).
- [ ] **Rollback probado** (Vercel → Render).
- [ ] **Aprobación operativa explícita** (no solo técnica).

Hasta entonces: **mantener Render** como backend de producción.

---

## 9. Riesgos y rollback

| Riesgo | Mitigación |
|--------|------------|
| Cutover prematuro a Worker incompleto | No cambiar `VITE_API_BASE_URL` hasta §7 |
| JWT dev en remoto | Solo `wrangler secret put` |
| D1 vacía o sin admin | Bootstrap SQL §5.3 antes de smoke |
| Pérdida de acceso | Render activo; rollback Vercel |
| CORS bloquea browser | Configurar `CORS_ORIGINS` antes de prueba UI |

---

## 10. Referencias

| Documento | Contenido |
|-----------|-----------|
| [backend-migration-inventory.md](./backend-migration-inventory.md) | Inventario completo frontend |
| [backend-migration-checklist.md](./backend-migration-checklist.md) | Fases y criterio Render |
| [cloudflare-worker-testing.md](./cloudflare-worker-testing.md) | 42 tests de contrato |
| [cloudflare-d1-local-dev.md](./cloudflare-d1-local-dev.md) | D1 local y pasos remotos base |
| [cloudflare-worker-staging-remote.md](./cloudflare-worker-staging-remote.md) | Runbook Bloque 16: D1 staging + deploy `--env staging` |
| [cloudflare-worker-auth.md](./cloudflare-worker-auth.md) | Auth, seed demo local |
| [cloudflare-worker-local-dev.md](./cloudflare-worker-local-dev.md) | `npm run dev`, health |

---

## Historial

| Bloque | Acción |
|--------|--------|
| 15 | Creación de este documento de readiness; sin deploy ni D1 remota |
