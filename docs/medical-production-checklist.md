# Checklist — Validación producción (app médica)

Marcar cada ítem en el entorno **real**: dominio Vercel production + Worker production + usuario médico de operación.

Guía para el médico: [medical-doctor-handoff.md](./medical-doctor-handoff.md).

---

## Infraestructura

- [ ] **Vercel production** carga la app (pantalla de login sin errores graves en consola).
- [ ] **`GET {WORKER_URL}/health`** responde `200` con cuerpo similar a `{"ok":true,"service":"geriatricos-worker"}`.

Ejemplo (PowerShell):

```powershell
$env:WORKER_URL = "https://geriatricos-worker-production.<account>.workers.dev"
curl.exe -s "$env:WORKER_URL/health"
```

- [ ] En Vercel, `VITE_API_BASE_URL` apunta al Worker production (**no** contiene `onrender.com`).
- [ ] Tras cambios de variables en Vercel, se hizo **redeploy** de production.

---

## Autenticación

- [ ] **Login médico** con email + contraseña temporal (usuario creado con `create-production-medical-user.mjs`).
- [ ] En **Mi cuenta**, se completa el **DNI** y se guarda.
- [ ] **Cambio de contraseña** en Mi cuenta funciona (contraseña nueva).
- [ ] Cerrar sesión e **ingresar con DNI** + contraseña nueva funciona.

---

## Pacientes

- [ ] **Crear paciente** (alta correcta, sin error de red).
- [ ] **Editar paciente** (guardar cambios).
- [ ] **Filtro por hogar** muestra solo pacientes del hogar elegido:
  - Nuestra Señora de Luján
  - El Trébol
  - El Amanecer

---

## Clínica e indicaciones

- [ ] **Historia clínica**: abrir paciente, ver resumen y registrar o ver contenido clínico.
- [ ] **Evolución**: crear o ver nota de evolución en el módulo clínico.
- [ ] **Indicación**: crear o consultar indicación / plan de medicación.

---

## Certificados e impresión

- [ ] **Certificado**: listar, crear y abrir un certificado.
- [ ] **Imprimir / guardar PDF** desde la vista de impresión del certificado (o informe clínico si aplica).

---

## Accesos externos (si aplica)

- [ ] Si en Vercel están `VITE_MISRX_URL`, `VITE_RECETO_URL` y/o `VITE_PAMI_URL`, el panel en el **Inicio médico** muestra los accesos.
- [ ] Si no hay URLs configuradas, omitir este ítem.

---

## Sin legacy ni ruido en UI

- [ ] DevTools → **Network**: **cero** requests a dominios `*.onrender.com` durante un recorrido normal (login, pacientes, clínica, certificados).
- [ ] **No** aparece modal de novedades / release notes al ingresar (modo médico).
- [ ] **No** aparece banner de actualización de versión (modo médico).
- [ ] Rutas legacy (ej. `/finance`, `/staff`) muestran **módulo no disponible** y permiten volver al **Inicio médico** (no pantalla en blanco ni error 500).

---

## Entrega al médico

- [ ] Credenciales temporales entregadas por canal seguro.
- [ ] Médico confirmó acceso a Mi cuenta, DNI y cambio de contraseña.
- [ ] Guía entregada: [medical-doctor-handoff.md](./medical-doctor-handoff.md).

---

## Si algo falla

| Situación | Acción |
|-----------|--------|
| La app no carga datos | Verificar `VITE_API_BASE_URL` en Vercel; redeploy. |
| `401` en todas las llamadas | Verificar `JWT_SECRET` en Worker; volver a iniciar sesión. |
| Login falla para usuario nuevo | Confirmar que el SQL médico se aplicó en D1 prod y que `facility_id` existe. |
| CORS en consola | Revisar `CORS_ORIGINS` en `wrangler.toml` incluye el origen Vercel exacto. |

---

## Historial

| Fecha | Evento |
|-------|--------|
| 2026-05-28 | B9 — Checklist de validación producción app médica |
