# Checklist — Baja de Render

Guía operativa para apagar **Render** (FastAPI + PostgreSQL) una vez validada la **app médica** en Vercel + Cloudflare Worker + D1.

**Estado del producto:** ver [medical-app-roadmap.md](./medical-app-roadmap.md).

**No hay migración de datos** desde Render hacia D1. Un backup de Render es **opcional** (archivo histórico), no requisito para seguir operando.

**Validación funcional detallada de la app médica** (login, pacientes, clínica, certificados, sin Render en Network): usar [medical-production-checklist.md](./medical-production-checklist.md). Guía para el médico: [medical-doctor-handoff.md](./medical-doctor-handoff.md).

---

## Antes de apagar — validaciones en producción

Marcar cada ítem en el entorno **real** (dominio Vercel production + Worker production).

### Infraestructura y API

- [ ] **Vercel production:** `VITE_API_BASE_URL` apunta a la URL del Worker production (`https://geriatricos-worker-production.<account>.workers.dev` o dominio custom si aplica). **No** debe contener `onrender.com`.
- [ ] Tras cualquier cambio de `VITE_API_BASE_URL`, se hizo **redeploy** de production en Vercel.
- [ ] **`GET {WORKER_URL}/health`** responde `200` con cuerpo similar a `{"ok":true,"service":"geriatricos-worker"}`.

Comando de ejemplo (PowerShell):

```powershell
$env:WORKER_URL = "https://geriatricos-worker-production.<account>.workers.dev"
curl.exe -s "$env:WORKER_URL/health"
```

Más smoke API: sección [Smoke tests mínimos](./cutover-render-cloudflare.md#smoke-tests-mínimos) en el runbook histórico.

### Flujos funcionales (app médica)

Probar en el navegador con la URL Vercel production (DevTools → Network debe mostrar requests al Worker).

- [ ] **Login** médico o superusuario (credenciales del bootstrap D1, no de staging).
- [ ] **Sede activa** seleccionada correctamente.
- [ ] **Crear paciente** (alta de resident).
- [ ] **Historia clínica:** resumen, notas y/o reporte clínico del paciente.
- [ ] **Indicaciones:** crear o consultar medication plan y horarios.
- [ ] **Certificados:** listar, crear y abrir un certificado.
- [ ] **Links externos:** si en Vercel están definidas `VITE_MISRX_URL`, `VITE_RECETO_URL` y/o `VITE_PAMI_URL`, el panel en el hub médico muestra los accesos configurados. Si no hay URLs, omitir este ítem.

---

## Backup opcional de Render

Solo si el equipo quiere conservar datos históricos del hogar legacy (no se importan a D1 automáticamente):

- [ ] Export o snapshot de PostgreSQL desde dashboard Render (o `pg_dump` si hay acceso).
- [ ] Anotar URL del servicio web Render y fecha del último deploy.
- [ ] Guardar credenciales de admin Render en gestor de secretos (por si hace falta consultar logs antes del borrado definitivo).

---

## Apagado en Render (orden recomendado)

1. [ ] **Suspender o eliminar el Web Service** (FastAPI) en Render.
2. [ ] Esperar unos minutos y confirmar que la app en Vercel **sigue funcionando** (sigue usando el Worker, no Render).
3. [ ] Si no se necesita más el respaldo: **eliminar o suspender la base PostgreSQL** en Render.
4. [ ] Anotar fecha, responsable y confirmación de que no quedan servicios activos facturables.

---

## Post-apagado — ventana de 24 horas

- [ ] En DevTools → **Network** (app Vercel): **cero** requests a dominios `*.onrender.com`.
- [ ] Revisar logs del Worker en Cloudflare: sin picos anómalos de `401`/`403`/`500` en auth, residents, clinical, medications, certificates.
- [ ] Confirmar con el equipo médico que no reportan errores de login o pacientes.

---

## Si algo falla

| Situación | Acción |
|-----------|--------|
| La app no carga datos / errores de red | Verificar `VITE_API_BASE_URL` en Vercel y que el valor coincida con la URL del Worker production; **redeploy** Vercel. |
| Errores CORS en consola | Revisar `CORS_ORIGINS` en `[env.production]` de `wrangler.toml` incluye el origen Vercel exacto; redeploy Worker (operación manual, fuera de este checklist de docs). |
| `401` masivo tras cambios | Verificar `JWT_SECRET` en Worker; usuarios deben volver a iniciar sesión. |
| Render ya apagado y la app rota | **No** hay rollback automático a Render sin reactivar el servicio en dashboard Render y restaurar `VITE_API_BASE_URL` a la URL `onrender.com` + redeploy Vercel. Planificar reactivación solo si se mantuvo backup/servicio. |
| Datos incorrectos en D1 | No usar seeds de staging/dev en prod; corregir con SQL operativo o script de superusuario — ver [medical-app-roadmap.md](./medical-app-roadmap.md). |

Mientras Render siga **activo** (antes del paso de apagado), rollback de emergencia documentado en [cutover-render-cloudflare.md](./cutover-render-cloudflare.md#rollback):

1. Vercel → `VITE_API_BASE_URL` = URL Render histórica.
2. Redeploy production en Vercel.

---

## Referencias

- [medical-app-roadmap.md](./medical-app-roadmap.md) — arquitectura y alcance actual.
- [cutover-render-cloudflare.md](./cutover-render-cloudflare.md) — runbook histórico (comandos wrangler y smoke).

---

## Historial

| Fecha | Evento |
|-------|--------|
| 2026-05-28 | B6 — Checklist creado |
