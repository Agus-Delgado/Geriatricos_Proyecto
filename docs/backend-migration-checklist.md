# Backend migration checklist (ejecutable)

> **Histórico / migración completa:** checklist para reemplazar **toda** la API Render por Worker + D1. La **app médica en producción** ya usa Worker + D1; Render es legacy. Estado vigente: [medical-app-roadmap.md](./medical-app-roadmap.md). Baja de Render: [render-shutdown-checklist.md](./render-shutdown-checklist.md).

## 1) Estado actual resumido

- Frontend en **Vercel** (app médica).
- Backend de producción de la app médica: **Cloudflare Workers + D1**.
- **Render:** fuera del flujo; apagado según [render-shutdown-checklist.md](./render-shutdown-checklist.md).
- Este checklist (fases 0–9) aplica si en el futuro se migran módulos **fuera de alcance médico** (staff, finanzas, etc.).

---

## 2) Fase 0 — Preparacion

### Checklist

- [ ] Confirmar endpoints MVP que se migran primero:
  - Auth base: `POST /auth/login`, `GET /auth/me`, `PUT /auth/me`, `POST /auth/active-facility`
  - Facilities: `GET /facilities`, `GET /facilities/{facilityId}`, `GET /facilities/by-slug/{slug}`
  - Residents: `GET /residents`, `GET /residents/{residentId}`, `POST /residents`, `PATCH /residents/{residentId}`, `DELETE /residents/{residentId}`
  - Contacts: `GET/POST/PATCH/DELETE /residents/{residentId}/contacts*`
- [ ] Confirmar tablas D1 minimas de arranque:
  - `users`, `user_roles`, `user_role_assignments`
  - `facilities`, `facility_user_access`
  - `residents`, `resident_contacts`
- [ ] Confirmar variables necesarias para Worker y frontend:
  - URL publica del Worker
  - secreto JWT
  - configuracion CORS (dominio Vercel)
  - cualquier secreto minimo adicional (si aplica)
- [ ] Definir estrategia de auth/JWT:
  - emision de token
  - validacion de token por endpoint
  - expiracion y manejo de 401
- [ ] Definir estrategia de usuario admin inicial:
  - alta inicial por seed/manual/script controlado
  - criterio para recuperar acceso admin
- [ ] Definir como se cargan hogares/facilities iniciales:
  - seed inicial
  - carga manual operativa
  - fuente de verdad de IDs/slug

### Criterio de done

- [ ] Hay decision clara y escrita de schema inicial D1, endpoints MVP y auth minima.

---

## 3) Fase 1 — Auth + facilities + residents

### Checklist por endpoint (MVP)

- [ ] Endpoint: `/auth/login`
  - Metodo: `POST`
  - Tabla D1 requerida: `users`, `user_role_assignments`, `user_roles`, `facility_user_access` (si aplica contexto activo)
  - Archivo frontend consumidor: `frontend/src/api/auth.ts`
  - Respuesta esperada: token/sesion (`TokenResponse`)
  - Criterio de done: login correcto con credenciales validas + error claro con credenciales invalidas

- [ ] Endpoint: `/auth/me`
  - Metodo: `GET`
  - Tabla D1 requerida: `users`, `facility_user_access`, `facilities`
  - Archivo frontend consumidor: `frontend/src/api/auth.ts`
  - Respuesta esperada: objeto `User`
  - Criterio de done: devuelve usuario autenticado con contexto de acceso sin romper `AuthContext`

- [ ] Endpoint: `/auth/me`
  - Metodo: `PUT`
  - Tabla D1 requerida: `users`
  - Archivo frontend consumidor: `frontend/src/api/auth.ts`
  - Respuesta esperada: `User` actualizado
  - Criterio de done: cambios persistidos y reflejados en recarga de sesion

- [ ] Endpoint: `/auth/active-facility`
  - Metodo: `POST`
  - Tabla D1 requerida: `facility_user_access`, `facilities`
  - Archivo frontend consumidor: `frontend/src/api/auth.ts`
  - Respuesta esperada: `{ active_facility_id: string }`
  - Criterio de done: cambio de facility activa sin errores de permisos

- [ ] Endpoint: `/facilities`
  - Metodo: `GET`
  - Tabla D1 requerida: `facilities`, `facility_user_access`
  - Archivo frontend consumidor: `frontend/src/api/facilities.ts`
  - Respuesta esperada: `Facility[]`
  - Criterio de done: listado consistente para usuario autenticado

- [ ] Endpoint: `/facilities/{facilityId}`
  - Metodo: `GET`
  - Tabla D1 requerida: `facilities`, `facility_user_access`
  - Archivo frontend consumidor: `frontend/src/api/facilities.ts`
  - Respuesta esperada: `Facility`
  - Criterio de done: detalle accesible solo si el usuario tiene acceso

- [ ] Endpoint: `/facilities/by-slug/{slug}`
  - Metodo: `GET`
  - Tabla D1 requerida: `facilities`
  - Archivo frontend consumidor: `frontend/src/api/facilities.ts`
  - Respuesta esperada: `Facility`
  - Criterio de done: resolucion por slug estable (publico o autenticado segun definicion de Fase 0)

- [ ] Endpoint: `/residents`
  - Metodo: `GET`
  - Tabla D1 requerida: `residents`
  - Archivo frontend consumidor: `frontend/src/api/residents.ts`
  - Respuesta esperada: `Resident[]`
  - Criterio de done: filtros basicos (`facility_id`, `q`, estado) operativos

- [ ] Endpoint: `/residents/{residentId}`
  - Metodo: `GET`
  - Tabla D1 requerida: `residents`
  - Archivo frontend consumidor: `frontend/src/api/residents.ts`
  - Respuesta esperada: `Resident`
  - Criterio de done: detalle de residente visible con control de acceso por facility

- [ ] Endpoint: `/residents`
  - Metodo: `POST`
  - Tabla D1 requerida: `residents`
  - Archivo frontend consumidor: `frontend/src/api/residents.ts`
  - Respuesta esperada: `Resident` creado
  - Criterio de done: alta correcta y visible inmediatamente en listado

- [ ] Endpoint: `/residents/{residentId}`
  - Metodo: `PATCH`
  - Tabla D1 requerida: `residents`
  - Archivo frontend consumidor: `frontend/src/api/residents.ts`
  - Respuesta esperada: `Resident` actualizado
  - Criterio de done: actualizacion parcial sin perder datos existentes

- [ ] Endpoint: `/residents/{residentId}`
  - Metodo: `DELETE`
  - Tabla D1 requerida: `residents`
  - Archivo frontend consumidor: `frontend/src/api/residents.ts`
  - Respuesta esperada: `void` o confirmacion
  - Criterio de done: baja logica/fisica segun definicion funcional, sin romper listados

- [ ] Endpoint: `/residents/{residentId}/contacts`
  - Metodo: `GET`
  - Tabla D1 requerida: `resident_contacts`
  - Archivo frontend consumidor: `frontend/src/api/contacts.ts`
  - Respuesta esperada: `ResidentContact[]`
  - Criterio de done: contactos visibles por residente

- [ ] Endpoint: `/residents/{residentId}/contacts`
  - Metodo: `POST`
  - Tabla D1 requerida: `resident_contacts`
  - Archivo frontend consumidor: `frontend/src/api/contacts.ts`
  - Respuesta esperada: `ResidentContact`
  - Criterio de done: nuevo contacto persistido y visible

- [ ] Endpoint: `/residents/{residentId}/contacts/{contactId}`
  - Metodo: `PATCH`
  - Tabla D1 requerida: `resident_contacts`
  - Archivo frontend consumidor: `frontend/src/api/contacts.ts`
  - Respuesta esperada: `ResidentContact`
  - Criterio de done: edicion parcial estable

- [ ] Endpoint: `/residents/{residentId}/contacts/{contactId}`
  - Metodo: `DELETE`
  - Tabla D1 requerida: `resident_contacts`
  - Archivo frontend consumidor: `frontend/src/api/contacts.ts`
  - Respuesta esperada: `void`
  - Criterio de done: eliminacion reflejada en UI sin inconsistencias

### Criterio de done de Fase 1

- [ ] Login y flujo base operativo desde Vercel contra Worker.
- [ ] Facilities y residents funcionales para operacion diaria minima.
- [ ] No depende de Render para auth/facilities/residents/contacts.

---

## 4) Fase 2 — Clinical + medications

### Checklist por endpoint

- [x] Endpoint: `/residents/{residentId}/clinical-summary`
  - Metodo: `GET`
  - Tabla D1 requerida: `clinical_summaries`
  - Archivo frontend consumidor: `frontend/src/api/clinical.ts`
  - Respuesta esperada: `ClinicalSummary`
  - Criterio de done: resumen clinico recuperable por residente

- [x] Endpoint: `/residents/{residentId}/clinical-summary`
  - Metodo: `PUT`
  - Tabla D1 requerida: `clinical_summaries`
  - Archivo frontend consumidor: `frontend/src/api/clinical.ts`
  - Respuesta esperada: `ClinicalSummary`
  - Criterio de done: actualizacion persistente y consistente

- [x] Endpoint: `/residents/{residentId}/clinical-notes`
  - Metodo: `GET`
  - Tabla D1 requerida: `clinical_notes`
  - Archivo frontend consumidor: `frontend/src/api/clinical.ts`
  - Respuesta esperada: `ClinicalNote[]`
  - Criterio de done: historial de notas visible en orden correcto

- [x] Endpoint: `/residents/{residentId}/clinical-notes`
  - Metodo: `POST`
  - Tabla D1 requerida: `clinical_notes`
  - Archivo frontend consumidor: `frontend/src/api/clinical.ts`
  - Respuesta esperada: `ClinicalNote`
  - Criterio de done: notas nuevas quedan registradas y visibles

- [x] Endpoint: `/residents/{residentId}/medication-plans`
  - Metodo: `GET`
  - Tabla D1 requerida: `medication_plans`
  - Archivo frontend consumidor: `frontend/src/api/medications.ts`
  - Respuesta esperada: `MedicationPlan[]`
  - Criterio de done: planes listan correctamente (`active_only`, orden `created_at DESC`)

- [x] Endpoint: `/residents/{residentId}/medication-plans`
  - Metodo: `POST`
  - Tabla D1 requerida: `medication_plans`
  - Archivo frontend consumidor: `frontend/src/api/medications.ts`
  - Respuesta esperada: `MedicationPlan`
  - Criterio de done: alta de plan funcional

- [ ] Endpoint: `/medication-plans/{planId}`
  - Metodo: `PATCH`
  - Tabla D1 requerida: `medication_plans`
  - Archivo frontend consumidor: `frontend/src/api/medications.ts` (definido, no usado por UI actual)
  - Respuesta esperada: `MedicationPlan`
  - Criterio de done: edicion parcial estable

- [x] Endpoint: `/medication-plans/{planId}/times`
  - Metodo: `POST`
  - Tabla D1 requerida: `medication_schedule_times`
  - Archivo frontend consumidor: `frontend/src/api/medications.ts`
  - Respuesta esperada: `MedicationScheduleTime`
  - Criterio de done: horario agregado (`time`, `day_of_week`)

- [x] Endpoint: `/medication-times/{timeId}`
  - Metodo: `DELETE`
  - Tabla D1 requerida: `medication_schedule_times`
  - Archivo frontend consumidor: `frontend/src/api/medications.ts`
  - Respuesta esperada: `void`
  - Criterio de done: horario eliminado sin datos huerfanos

- [ ] Endpoint: `/residents/{residentId}/medication-administrations`
  - Metodo: `POST`
  - Tabla D1 requerida: `medication_administrations`
  - Archivo frontend consumidor: `frontend/src/api/medications.ts` (no consumido por UI actual)
  - Respuesta esperada: `MedicationAdministration`
  - Criterio de done: registro de administracion persistido

- [ ] Endpoint: `/residents/{residentId}/medication-administrations`
  - Metodo: `GET`
  - Tabla D1 requerida: `medication_administrations`
  - Archivo frontend consumidor: `frontend/src/api/medications.ts` (no consumido por UI actual)
  - Respuesta esperada: `MedicationAdministration[]`
  - Criterio de done: historial diario consultable

- [ ] Endpoint: `/facilities/{facilityId}/medication-due`
  - Metodo: `GET`
  - Tabla D1 requerida: `medication_plans`, `medication_schedule_times`, `medication_administrations`
  - Archivo frontend consumidor: `frontend/src/api/medications.ts` (no consumido por UI actual; `MedicationDuePage` redirige)
  - Respuesta esperada: lista de pendientes
  - Criterio de done: pendientes correctos por fecha/facility

### Criterio de done de Fase 2

- [ ] Clinical y medications operativos sin dependencia de Render.
- [ ] Flujo diario de carga/ejecucion de medicacion validado por UI.

---

## 5) Fase 3 — Staff + shifts + attendance + agenda

### Checklist por endpoint

- [ ] Endpoint: `/staff`
  - Metodo: `GET`
  - Tabla D1 requerida: `staff`
  - Archivo frontend consumidor: `frontend/src/api/staff.ts`
  - Respuesta esperada: `Staff[]`
  - Criterio de done: listado con filtros basicos funcional

- [ ] Endpoint: `/staff/{staffId}`
  - Metodo: `GET`
  - Tabla D1 requerida: `staff`
  - Archivo frontend consumidor: `frontend/src/api/staff.ts`
  - Respuesta esperada: `Staff`
  - Criterio de done: detalle correcto por id

- [ ] Endpoint: `/staff`
  - Metodo: `POST`
  - Tabla D1 requerida: `staff`
  - Archivo frontend consumidor: `frontend/src/api/staff.ts`
  - Respuesta esperada: `Staff`
  - Criterio de done: alta de personal estable

- [ ] Endpoint: `/staff/{staffId}`
  - Metodo: `PATCH`
  - Tabla D1 requerida: `staff`
  - Archivo frontend consumidor: `frontend/src/api/staff.ts`
  - Respuesta esperada: `Staff`
  - Criterio de done: edicion parcial estable

- [ ] Endpoint: `/shifts`
  - Metodo: `GET`
  - Tabla D1 requerida: `shifts`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `Shift[]`
  - Criterio de done: turnos visibles por facility

- [ ] Endpoint: `/shifts/{shiftId}`
  - Metodo: `GET`
  - Tabla D1 requerida: `shifts`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `Shift`
  - Criterio de done: detalle de turno correcto

- [ ] Endpoint: `/shifts`
  - Metodo: `POST`
  - Tabla D1 requerida: `shifts`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `Shift`
  - Criterio de done: creacion de turno funcional

- [ ] Endpoint: `/shifts/{shiftId}`
  - Metodo: `PATCH`
  - Tabla D1 requerida: `shifts`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `Shift`
  - Criterio de done: actualizacion de turno sin inconsistencias

- [ ] Endpoint: `/shifts/{shiftId}`
  - Metodo: `DELETE`
  - Tabla D1 requerida: `shifts`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `void`
  - Criterio de done: baja de turno sin romper asignaciones activas

- [ ] Endpoint: `/shifts/assignments`
  - Metodo: `GET`
  - Tabla D1 requerida: `shift_assignments`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `ShiftAssignment[]`
  - Criterio de done: vista de asignaciones correcta por rango

- [ ] Endpoint: `/shifts/assignments/{assignmentId}`
  - Metodo: `GET`
  - Tabla D1 requerida: `shift_assignments`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `ShiftAssignment`
  - Criterio de done: detalle de asignacion correcto

- [ ] Endpoint: `/shifts/assignments`
  - Metodo: `POST`
  - Tabla D1 requerida: `shift_assignments`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `ShiftAssignment`
  - Criterio de done: alta de asignacion persistida

- [ ] Endpoint: `/shifts/assignments/{assignmentId}`
  - Metodo: `PATCH`
  - Tabla D1 requerida: `shift_assignments`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `ShiftAssignment`
  - Criterio de done: edicion parcial estable

- [ ] Endpoint: `/shifts/assignments/{assignmentId}`
  - Metodo: `DELETE`
  - Tabla D1 requerida: `shift_assignments`
  - Archivo frontend consumidor: `frontend/src/api/shifts.ts`
  - Respuesta esperada: `void`
  - Criterio de done: eliminacion sin residuos funcionales

- [ ] Endpoint: `/attendance`
  - Metodo: `GET`
  - Tabla D1 requerida: `attendances`
  - Archivo frontend consumidor: `frontend/src/api/attendance.ts`
  - Respuesta esperada: `Attendance[]`
  - Criterio de done: listado de asistencia correcto por rango

- [ ] Endpoint: `/attendance`
  - Metodo: `POST`
  - Tabla D1 requerida: `attendances`
  - Archivo frontend consumidor: `frontend/src/api/attendance.ts`
  - Respuesta esperada: `Attendance`
  - Criterio de done: check-in correcto

- [ ] Endpoint: `/attendance/{attendanceId}/check-out`
  - Metodo: `POST`
  - Tabla D1 requerida: `attendances`
  - Archivo frontend consumidor: `frontend/src/api/attendance.ts`
  - Respuesta esperada: `Attendance`
  - Criterio de done: check-out correcto y consistente

- [ ] Endpoint: `/agenda/today`
  - Metodo: `GET`
  - Tabla D1 requerida: `agenda_entries`
  - Archivo frontend consumidor: `frontend/src/api/agenda.ts`
  - Respuesta esperada: `AgendaEntry[]`
  - Criterio de done: agenda diaria visible por fecha

- [ ] Endpoint: `/agenda`
  - Metodo: `POST`
  - Tabla D1 requerida: `agenda_entries`
  - Archivo frontend consumidor: `frontend/src/api/agenda.ts`
  - Respuesta esperada: `AgendaEntry`
  - Criterio de done: creacion de entrada correcta

- [ ] Endpoint: `/agenda/{entryId}`
  - Metodo: `PATCH`
  - Tabla D1 requerida: `agenda_entries`
  - Archivo frontend consumidor: `frontend/src/api/agenda.ts`
  - Respuesta esperada: `AgendaEntry`
  - Criterio de done: actualizacion parcial correcta

- [ ] Endpoint: `/agenda/{entryId}`
  - Metodo: `DELETE`
  - Tabla D1 requerida: `agenda_entries`
  - Archivo frontend consumidor: `frontend/src/api/agenda.ts`
  - Respuesta esperada: `void`
  - Criterio de done: eliminacion reflejada en UI

### Criterio de done de Fase 3

- [ ] Operacion diaria de personal, turnos, asistencia y agenda funcionando desde Vercel contra Worker.

---

## 6) Fase 4 — Dashboard basico + activity minima

### Checklist por endpoint

- [ ] Endpoint: `/dashboard/summary`
  - Metodo: `GET`
  - Tabla D1 requerida: agregados de `residents`, `attendances`, `agenda_entries` (y otras metricas minimas definidas)
  - Archivo frontend consumidor: `frontend/src/api/dashboard.ts`
  - Respuesta esperada: `DayStats` (o contrato equivalente soportado por frontend)
  - Criterio de done: home del frontend carga sin errores funcionales

- [ ] Endpoint: `/activity`
  - Metodo: `GET`
  - Tabla D1 requerida: `activity_events` (minima)
  - Archivo frontend consumidor: `frontend/src/api/activity.ts`
  - Respuesta esperada: `ActivityEvent[]`
  - Criterio de done: feed minimo visible; si no es critico, permitir degradacion controlada definida

### Criterio de done de Fase 4

- [ ] Dashboard principal operativo.
- [ ] Activity minima resuelta (implementada o desactivada de forma segura y acordada).

---

## 7) Fase 5 — Funcionalidades postergables

Incluir y evaluar solo cuando el MVP este estable:

- Certificados PDF
  - Se posterga por complejidad de generacion PDF y dependencias (`reportlab`).
- Push notifications
  - Se posterga por complejidad de VAPID/suscripciones y operacion en Worker.
- Soporte (`/support/bug-report`)
  - Se posterga por integracion de email y baja criticidad para operacion core.
- Finanzas
  - Se posterga si no bloquea operacion clinica/administrativa diaria.
- Integraciones externas (`external-platforms`, `external-events`)
  - Se posterga por dependencia de terceros y variabilidad de uso real.
- Activity avanzada (`/activity/saved`, guardar/quitar, expiraciones)
  - Se posterga por complejidad adicional y menor impacto en continuidad basica.

### Criterio de done de Fase 5

- [ ] Cada modulo postergado tiene decision explicita: migrar, reemplazar o retirar.

---

## 8) Riesgos antes de apagar Render

### Checklist

- [ ] Login funciona desde Vercel contra Worker.
- [ ] CORS correcto para dominio Vercel.
- [ ] Datos minimos cargados en D1.
- [ ] Usuario admin operativo.
- [ ] Rutas principales probadas extremo a extremo.
- [ ] Render sigue activo durante pruebas.
- [ ] `VITE_API_BASE_URL` en Vercel apunta al Worker recien al final.

---

## 9) Criterio final para dar de baja Render

Condiciones conservadoras (todas verdaderas):

- [ ] Fase 1 a Fase 4 completadas y validadas funcionalmente.
- [ ] Incidencias criticas (auth, residents, medications, staff/attendance) en 0 abiertas.
- [ ] Monitoreo basico activo sobre Worker (errores y latencia).
- [ ] Prueba de operacion real en ventana controlada sin depender de Render.
- [ ] Rollback definido (volver temporalmente `VITE_API_BASE_URL` a Render) y probado.
- [ ] Aprobacion final operativa (no solo tecnica) para corte.

Solo despues de cumplir estos puntos, avanzar con baja de Render.
