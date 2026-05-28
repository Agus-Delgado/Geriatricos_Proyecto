# Backend migration inventory (Render -> Cloudflare Workers + D1)

## Objetivo de este documento

Este bloque es solo de relevamiento para decidir el backend minimo que hay que construir en Cloudflare y poder apagar Render mas adelante sin improvisar.

Fuera de alcance en este bloque:
- No crear Workers.
- No crear D1.
- No modificar frontend.
- No modificar backend.
- No tocar Vercel ni Render.
- No borrar lo hecho para Cloudflare Pages (queda como preparacion opcional).

---

## Contexto tecnico actual

- Frontend desplegado en Vercel.
- Backend actual en FastAPI + SQLAlchemy sobre PostgreSQL (Render).
- Frontend consume API por `VITE_API_BASE_URL` (fallback local: `http://localhost:8000`) desde `frontend/src/api/client.ts`.
- Autenticacion en frontend via `Authorization: Bearer <token>` (token en `localStorage`) para la mayoria de requests.

---

## 1) Endpoints usados por el frontend actual (confirmados)

Notas:
- "Archivo frontend consumidor" referencia el modulo API donde se realiza el request.
- "Auth" indica si, por comportamiento del cliente, se envia token o se espera endpoint publico.
- "Prioridad" clasifica para migracion: `MVP` / `despues` / `dudoso`.

### Auth / Admin

- `POST /auth/login`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `LoginRequest` (credenciales)
  - Respuesta inferida: `TokenResponse`
  - Auth: No
  - Prioridad: MVP

- `GET /auth/me`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `User`
  - Auth: Si
  - Prioridad: MVP

- `POST /auth/active-facility`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `SetActiveFacilityRequest`
  - Respuesta inferida: `{ active_facility_id: string }`
  - Auth: Si
  - Prioridad: MVP

- `POST /auth/register`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `RegisterRequest`
  - Respuesta inferida: `RegisterResponse`
  - Auth: No (esperable)
  - Prioridad: MVP

- `POST /auth/verify-email`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `VerifyEmailRequest`
  - Respuesta inferida: `VerifyEmailResponse`
  - Auth: No (token de verificacion)
  - Prioridad: despues

- `POST /auth/resend-verification`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `ResendVerificationRequest`
  - Respuesta inferida: `ResendVerificationResponse`
  - Auth: Dudoso (depende implementacion backend)
  - Prioridad: despues

- `PUT /auth/me`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `UpdateProfileRequest`
  - Respuesta inferida: `User`
  - Auth: Si
  - Prioridad: MVP

- `POST /auth/password-reset/request`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `{ email: string }`
  - Respuesta inferida: `void` / mensaje
  - Auth: No
  - Prioridad: despues

- `POST /auth/password-reset/confirm`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `{ token: string, new_password: string }`
  - Respuesta inferida: `void` / mensaje
  - Auth: No
  - Prioridad: despues

- `GET /admin/users`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `AdminUsersListResponse`
  - Auth: Si (admin)
  - Prioridad: despues

- `POST /admin/impersonate`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `ImpersonateRequest`
  - Respuesta inferida: `ImpersonateResponse`
  - Auth: Si (admin)
  - Prioridad: despues

- `POST /admin/impersonate/stop`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `{}`
  - Respuesta inferida: `void` / mensaje
  - Auth: Si (admin)
  - Prioridad: despues

- `PATCH /admin/users/{userId}/status`
  - Archivo: `frontend/src/api/auth.ts`
  - Payload inferido: `UpdateUserStatusRequest`
  - Respuesta inferida: `void` / mensaje
  - Auth: Si (admin)
  - Prioridad: despues

### Facilities

- `GET /facilities`
  - Archivo: `frontend/src/api/facilities.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `Facility[]`
  - Auth: Si
  - Prioridad: MVP

- `GET /facilities/{facilityId}`
  - Archivo: `frontend/src/api/facilities.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `Facility`
  - Auth: Si
  - Prioridad: MVP

- `GET /facilities/by-slug/{slug}`
  - Archivo: `frontend/src/api/facilities.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `Facility`
  - Auth: Dudoso (puede ser publico)
  - Prioridad: MVP

### Residents + Contacts + Documents (upload)

- `GET /residents`
  - Archivo: `frontend/src/api/residents.ts`
  - Payload inferido: query params (`facility_id`, `q`, `stay_status`, `status`)
  - Respuesta inferida: `Resident[]`
  - Auth: Si
  - Prioridad: MVP

- `GET /residents/{residentId}`
  - Archivo: `frontend/src/api/residents.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `Resident`
  - Auth: Si
  - Prioridad: MVP

- `POST /residents`
  - Archivo: `frontend/src/api/residents.ts`
  - Payload inferido: `ResidentCreate`
  - Respuesta inferida: `Resident`
  - Auth: Si
  - Prioridad: MVP

- `PATCH /residents/{residentId}`
  - Archivo: `frontend/src/api/residents.ts`
  - Payload inferido: `ResidentUpdate`
  - Respuesta inferida: `Resident`
  - Auth: Si
  - Prioridad: MVP

- `DELETE /residents/{residentId}`
  - Archivo: `frontend/src/api/residents.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `void`
  - Auth: Si
  - Prioridad: MVP

- `GET /residents/deleted`
  - Archivo: `frontend/src/api/residents.ts`
  - Payload inferido: query params (`facility_id`, `q`, `within_days`)
  - Respuesta inferida: `Resident[]`
  - Auth: Si
  - Prioridad: despues

- `POST /residents/{residentId}/restore`
  - Archivo: `frontend/src/api/residents.ts`
  - Payload inferido: body vacio + query `within_days`
  - Respuesta inferida: `Resident`
  - Auth: Si
  - Prioridad: despues

- `POST /residents/{residentId}/document`
  - Archivo: `frontend/src/api/residents.ts` (fetch directo multipart)
  - Payload inferido: `FormData` con `file`
  - Respuesta inferida: metadata de documento
  - Auth: Si
  - Prioridad: despues

- `GET /residents/{residentId}/contacts`
  - Archivo: `frontend/src/api/contacts.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `ResidentContact[]`
  - Auth: Si
  - Prioridad: MVP

- `POST /residents/{residentId}/contacts`
  - Archivo: `frontend/src/api/contacts.ts`
  - Payload inferido: `ResidentContactCreate`
  - Respuesta inferida: `ResidentContact`
  - Auth: Si
  - Prioridad: MVP

- `PATCH /residents/{residentId}/contacts/{contactId}`
  - Archivo: `frontend/src/api/contacts.ts`
  - Payload inferido: `ResidentContactUpdate`
  - Respuesta inferida: `ResidentContact`
  - Auth: Si
  - Prioridad: MVP

- `DELETE /residents/{residentId}/contacts/{contactId}`
  - Archivo: `frontend/src/api/contacts.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `void`
  - Auth: Si
  - Prioridad: MVP

### Clinical

- `GET /residents/{residentId}/clinical-summary`
  - Archivo: `frontend/src/api/clinical.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `ClinicalSummary`
  - Auth: Si
  - Prioridad: MVP

- `PUT /residents/{residentId}/clinical-summary`
  - Archivo: `frontend/src/api/clinical.ts`
  - Payload inferido: `ClinicalSummaryUpdate`
  - Respuesta inferida: `ClinicalSummary`
  - Auth: Si
  - Prioridad: MVP

- `GET /residents/{residentId}/clinical-notes`
  - Archivo: `frontend/src/api/clinical.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `ClinicalNote[]`
  - Auth: Si
  - Prioridad: MVP

- `POST /residents/{residentId}/clinical-notes`
  - Archivo: `frontend/src/api/clinical.ts`
  - Payload inferido: `ClinicalNoteCreate`
  - Respuesta inferida: `ClinicalNote`
  - Auth: Si
  - Prioridad: MVP

- `GET /residents/{residentId}/clinical-history.pdf`
  - Archivo: `frontend/src/api/clinical.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `Blob` (PDF)
  - Auth: Si
  - Prioridad: despues

### Medications

- `GET /residents/{residentId}/medication-plans`
  - Archivo: `frontend/src/api/medications.ts`
  - Payload inferido: query `active_only`
  - Respuesta inferida: `MedicationPlan[]`
  - Auth: Si
  - Prioridad: MVP

- `POST /residents/{residentId}/medication-plans`
  - Archivo: `frontend/src/api/medications.ts`
  - Payload inferido: `MedicationPlanCreate`
  - Respuesta inferida: `MedicationPlan`
  - Auth: Si
  - Prioridad: MVP

- `PATCH /medication-plans/{planId}`
  - Archivo: `frontend/src/api/medications.ts`
  - Payload inferido: `MedicationPlanUpdate`
  - Respuesta inferida: `MedicationPlan`
  - Auth: Si
  - Prioridad: MVP

- `POST /medication-plans/{planId}/times`
  - Archivo: `frontend/src/api/medications.ts`
  - Payload inferido: `MedicationScheduleTimeCreate`
  - Respuesta inferida: `MedicationScheduleTime`
  - Auth: Si
  - Prioridad: MVP

- `DELETE /medication-times/{timeId}`
  - Archivo: `frontend/src/api/medications.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `void`
  - Auth: Si
  - Prioridad: MVP

- `POST /residents/{residentId}/medication-administrations`
  - Archivo: `frontend/src/api/medications.ts`
  - Payload inferido: `MedicationAdministrationCreate`
  - Respuesta inferida: `MedicationAdministration`
  - Auth: Si
  - Prioridad: MVP

- `GET /residents/{residentId}/medication-administrations`
  - Archivo: `frontend/src/api/medications.ts`
  - Payload inferido: query `date`
  - Respuesta inferida: `MedicationAdministration[]`
  - Auth: Si
  - Prioridad: MVP

- `GET /facilities/{facilityId}/medication-due`
  - Archivo: `frontend/src/api/medications.ts`
  - Payload inferido: query `date`
  - Respuesta inferida: lista de pendientes de medicacion
  - Auth: Si
  - Prioridad: MVP

### Prescriptions

- `GET /patients/{patientId}/prescriptions`
  - Archivo: `frontend/src/api/prescriptions.ts`
  - Payload inferido: query `limit`
  - Respuesta inferida: `PrescriptionLog[]`
  - Auth: Si (probable)
  - Prioridad: despues

- `POST /patients/{patientId}/prescriptions`
  - Archivo: `frontend/src/api/prescriptions.ts`
  - Payload inferido: `PrescriptionLogCreate`
  - Respuesta inferida: `PrescriptionLog`
  - Auth: Si (probable)
  - Prioridad: despues

### Staff + Shifts + Attendance

- `GET /staff`
  - Archivo: `frontend/src/api/staff.ts`
  - Payload inferido: query `facility_id`, `active_only`, `q`
  - Respuesta inferida: `Staff[]`
  - Auth: Si
  - Prioridad: MVP

- `GET /staff/{staffId}`
  - Archivo: `frontend/src/api/staff.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `Staff`
  - Auth: Si
  - Prioridad: MVP

- `POST /staff`
  - Archivo: `frontend/src/api/staff.ts`
  - Payload inferido: `StaffCreate`
  - Respuesta inferida: `Staff`
  - Auth: Si
  - Prioridad: MVP

- `PATCH /staff/{staffId}`
  - Archivo: `frontend/src/api/staff.ts`
  - Payload inferido: `StaffUpdate`
  - Respuesta inferida: `Staff`
  - Auth: Si
  - Prioridad: MVP

- `POST /staff/{staffId}/transfer`
  - Archivo: `frontend/src/api/staff.ts`
  - Payload inferido: query `to_facility_id`
  - Respuesta inferida: `Staff`
  - Auth: Si
  - Prioridad: despues

- `GET /staff/{staffId}/report`
  - Archivo: `frontend/src/api/staff.ts`
  - Payload inferido: query `from_date`, `to_date`
  - Respuesta inferida: `StaffReportResponse`
  - Auth: Si
  - Prioridad: despues

- `GET /shifts`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: query `facility_id`, `active_only`
  - Respuesta inferida: `Shift[]`
  - Auth: Si
  - Prioridad: MVP

- `GET /shifts/{shiftId}`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `Shift`
  - Auth: Si
  - Prioridad: MVP

- `POST /shifts`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: `ShiftCreate`
  - Respuesta inferida: `Shift`
  - Auth: Si
  - Prioridad: MVP

- `PATCH /shifts/{shiftId}`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: `ShiftUpdate`
  - Respuesta inferida: `Shift`
  - Auth: Si
  - Prioridad: MVP

- `DELETE /shifts/{shiftId}`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `void`
  - Auth: Si
  - Prioridad: MVP

- `GET /shifts/assignments`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: query `facility_id`, `start_date`, `end_date`, `staff_id`, `shift_id`
  - Respuesta inferida: `ShiftAssignment[]`
  - Auth: Si
  - Prioridad: MVP

- `GET /shifts/assignments/{assignmentId}`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `ShiftAssignment`
  - Auth: Si
  - Prioridad: MVP

- `POST /shifts/assignments`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: `ShiftAssignmentCreate`
  - Respuesta inferida: `ShiftAssignment`
  - Auth: Si
  - Prioridad: MVP

- `PATCH /shifts/assignments/{assignmentId}`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: `ShiftAssignmentUpdate`
  - Respuesta inferida: `ShiftAssignment`
  - Auth: Si
  - Prioridad: MVP

- `DELETE /shifts/assignments/{assignmentId}`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `void`
  - Auth: Si
  - Prioridad: MVP

- `POST /shifts/assignments/bulk`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: parametros por query (`facility_id`, `staff_id`, `shift_id`, `start_date`, `end_date`, `days_of_week`)
  - Respuesta inferida: resultado de creacion masiva
  - Auth: Si
  - Prioridad: despues

- `GET /shifts/dashboard/{facilityId}`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `FacilityStaffDashboard`
  - Auth: Si
  - Prioridad: despues

- `GET /shifts/currently-working/{facilityId}`
  - Archivo: `frontend/src/api/shifts.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `CurrentlyWorkingStaff[]`
  - Auth: Si
  - Prioridad: despues

- `GET /attendance`
  - Archivo: `frontend/src/api/attendance.ts`
  - Payload inferido: query `facility_id`, `from_date`, `to_date`, `staff_id`
  - Respuesta inferida: `Attendance[]`
  - Auth: Si
  - Prioridad: MVP

- `POST /attendance`
  - Archivo: `frontend/src/api/attendance.ts`
  - Payload inferido: `AttendanceCreate`
  - Respuesta inferida: `Attendance`
  - Auth: Si
  - Prioridad: MVP

- `POST /attendance/{attendanceId}/check-out`
  - Archivo: `frontend/src/api/attendance.ts`
  - Payload inferido: `AttendanceCheckOut`
  - Respuesta inferida: `Attendance`
  - Auth: Si
  - Prioridad: MVP

- `GET /attendance/report`
  - Archivo: `frontend/src/api/attendance.ts`
  - Payload inferido: query `facility_id`, `from_date`, `to_date`
  - Respuesta inferida: `AttendanceReport[]`
  - Auth: Si
  - Prioridad: despues

### Agenda + Dashboard + Activity

- `GET /agenda/today`
  - Archivo: `frontend/src/api/agenda.ts`
  - Payload inferido: query `date`
  - Respuesta inferida: `AgendaEntry[]`
  - Auth: Si
  - Prioridad: MVP

- `POST /agenda`
  - Archivo: `frontend/src/api/agenda.ts`
  - Payload inferido: `AgendaEntryCreate`
  - Respuesta inferida: `AgendaEntry`
  - Auth: Si
  - Prioridad: MVP

- `PATCH /agenda/{entryId}`
  - Archivo: `frontend/src/api/agenda.ts`
  - Payload inferido: `AgendaEntryUpdate`
  - Respuesta inferida: `AgendaEntry`
  - Auth: Si
  - Prioridad: MVP

- `DELETE /agenda/{entryId}`
  - Archivo: `frontend/src/api/agenda.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `void`
  - Auth: Si
  - Prioridad: MVP

- `GET /dashboard/summary`
  - Archivo: `frontend/src/api/dashboard.ts`
  - Payload inferido: query `date`
  - Respuesta inferida: `DayStats` (frontend contempla `null` ante 404/500)
  - Auth: Si (probable)
  - Prioridad: MVP

- `GET /activity`
  - Archivo: `frontend/src/api/activity.ts`
  - Payload inferido: query `facility_id`, `since`, `limit`, `event_types`
  - Respuesta inferida: `ActivityEvent[]`
  - Auth: Si
  - Prioridad: despues

- `GET /activity/saved`
  - Archivo: `frontend/src/api/activity.ts`
  - Payload inferido: query `facility_id`, `limit`
  - Respuesta inferida: `ActivityEvent[]`
  - Auth: Si
  - Prioridad: despues

- `POST /activity/{eventId}/save`
  - Archivo: `frontend/src/api/activity.ts`
  - Payload inferido: `{ note?: string }` (o body vacio)
  - Respuesta inferida: `{ message, expires_at }`
  - Auth: Si
  - Prioridad: despues

- `DELETE /activity/{eventId}/save`
  - Archivo: `frontend/src/api/activity.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `{ message }`
  - Auth: Si
  - Prioridad: despues

### Finance + Certificates + Push + Support

- `GET /finance/categories`
  - Archivo: `frontend/src/api/finance.ts`
  - Payload inferido: query `type`
  - Respuesta inferida: `FinanceCategory[]`
  - Auth: Si
  - Prioridad: despues

- `POST /finance/categories`
  - Archivo: `frontend/src/api/finance.ts`
  - Payload inferido: `FinanceCategoryCreate`
  - Respuesta inferida: `FinanceCategory`
  - Auth: Si
  - Prioridad: despues

- `GET /finance/transactions`
  - Archivo: `frontend/src/api/finance.ts`
  - Payload inferido: query `facility_id`, `from_date`, `to_date`
  - Respuesta inferida: `FinanceTransaction[]`
  - Auth: Si
  - Prioridad: despues

- `POST /finance/transactions`
  - Archivo: `frontend/src/api/finance.ts`
  - Payload inferido: `FinanceTransactionCreate`
  - Respuesta inferida: `FinanceTransaction`
  - Auth: Si
  - Prioridad: despues

- `GET /finance/summary`
  - Archivo: `frontend/src/api/finance.ts`
  - Payload inferido: query `facility_id`, `month`
  - Respuesta inferida: `FinanceSummary`
  - Auth: Si
  - Prioridad: despues

- `GET /certificates`
  - Archivo: `frontend/src/api/certificates.ts`
  - Payload inferido: query `resident_id`, `facility_id`, `certificate_type`
  - Respuesta inferida: `Certificate[]`
  - Auth: Si
  - Prioridad: despues

- `GET /certificates/{certificateId}`
  - Archivo: `frontend/src/api/certificates.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `Certificate`
  - Auth: Si
  - Prioridad: despues

- `POST /certificates`
  - Archivo: `frontend/src/api/certificates.ts`
  - Payload inferido: `CertificateCreate`
  - Respuesta inferida: `Certificate`
  - Auth: Si
  - Prioridad: despues

- `PATCH /certificates/{certificateId}`
  - Archivo: `frontend/src/api/certificates.ts`
  - Payload inferido: `CertificateUpdate`
  - Respuesta inferida: `Certificate`
  - Auth: Si
  - Prioridad: despues

- `GET /push/vapid-public-key`
  - Archivo: `frontend/src/api/push.ts`
  - Payload inferido: sin body
  - Respuesta inferida: `{ public_key: string }`
  - Auth: Si (probable)
  - Prioridad: despues

- `POST /push/subscribe`
  - Archivo: `frontend/src/api/push.ts`
  - Payload inferido: `{ facility_id, endpoint, keys{p256dh,auth}, user_agent? }`
  - Respuesta inferida: `{ message }`
  - Auth: Si
  - Prioridad: despues

- `POST /push/unsubscribe`
  - Archivo: `frontend/src/api/push.ts`
  - Payload inferido: `{ facility_id, endpoint }`
  - Respuesta inferida: `{ message }`
  - Auth: Si
  - Prioridad: despues

- `GET /push/preferences`
  - Archivo: `frontend/src/api/push.ts`
  - Payload inferido: query `facility_id`
  - Respuesta inferida: preferencias del usuario
  - Auth: Si
  - Prioridad: despues

- `POST /push/preferences`
  - Archivo: `frontend/src/api/push.ts`
  - Payload inferido: `{ facility_id, disabled_event_types: string[] }`
  - Respuesta inferida: preferencias actualizadas
  - Auth: Si
  - Prioridad: despues

- `POST /push/test`
  - Archivo: `frontend/src/api/push.ts`
  - Payload inferido: `{ facility_id }`
  - Respuesta inferida: resultado de envio de prueba
  - Auth: Si
  - Prioridad: despues

- `POST /support/bug-report`
  - Archivo: `frontend/src/api/support.ts`
  - Payload inferido: `{ message, path?, facility_id?, build_id?, build_time?, user_agent? }`
  - Respuesta inferida: `{ message: string }`
  - Auth: Dudoso (podria aceptar anonimo o autenticado)
  - Prioridad: despues

---

## 2) Endpoints existentes en backend sin uso confirmado desde frontend

Estos endpoints existen en `backend/app/api/routes`, pero no hay evidencia de consumo directo en los modulos API del frontend actual:

- `GET /residents/{resident_id}/vital-signs`
- `POST /residents/{resident_id}/vital-signs`
- `PUT /agenda/{entry_id}` (frontend usa `PATCH`)
- `POST /residents/{resident_id}/documents`
- `GET /residents/{resident_id}/documents`
- `DELETE /residents/{resident_id}/documents/{doc_id}`
- `GET /external-platforms`
- `POST /external-platforms`
- `PUT /external-platforms/{platform_id}`
- `DELETE /external-platforms/{platform_id}`
- `POST /residents/{resident_id}/external-events`
- `GET /residents/{resident_id}/external-events`
- `PUT /finance/categories/{category_id}`
- `GET /finance/summary/group`

Implicancia: no deben bloquear el corte MVP inicial si el objetivo es reemplazar Render con el minimo backend operativo para el frontend actual.

---

## 3) Endpoints dudosos o no inferibles

Casos donde no se puede afirmar al 100% contrato o requisito de auth solo desde frontend:

- `POST /auth/resend-verification`
  - No totalmente claro si requiere sesion o solo email/token.
- `GET /facilities/by-slug/{slug}`
  - Puede ser publico o protegido segun reglas backend.
- `GET /dashboard/summary`
  - Frontend asume tolerancia a error (404/500 -> `null`), contrato final no estricto desde cliente.
- `POST /support/bug-report`
  - Puede operar con o sin autenticacion.
- Endpoints de admin (`/admin/*`)
  - Uso funcional depende de usuarios con rol admin, por lo tanto no criticos para continuidad operativa general.

---

## 4) Endpoints existentes en backend (superficie completa)

Referencia de routers montados en `backend/app/main.py`:

- `/auth` (login, me, register, verify-email, password reset, active-facility)
- `/admin` (users, impersonation, status)
- `/facilities`
- `/residents`
- `/residents/{resident_id}/contacts`
- `/residents/{resident_id}` (clinical + vital signs + PDF)
- medicacion (`/residents/{id}/medication-*`, `/medication-*`, `/facilities/{id}/medication-due`)
- prescripciones (`/patients/{patient_id}/prescriptions`)
- `/agenda`
- `/residents/{resident_id}/documents`
- `/certificates`
- `/external-platforms`
- `/residents/{resident_id}/external-events`
- `/finance`
- `/staff`
- `/shifts`
- `/attendance`
- `/dashboard`
- `/activity`
- `/push`
- `/support`

---

## 5) Modelos SQLAlchemy y tablas principales

Fuente: `backend/app/models`.

### Core recomendado para D1 en MVP

- Auth/organizacion:
  - `users`
  - `user_roles`
  - `user_role_assignments`
  - `facilities`
  - `facility_user_access`
  - (opcional temprano) `owner_groups`
- Residentes:
  - `residents`
  - `resident_contacts`
- Clinica:
  - `clinical_summaries`
  - `clinical_notes`
- Medicacion:
  - `medication_plans`
  - `medication_schedule_times`
  - `medication_administrations`
- Staff/operacion:
  - `staff`
  - `shifts`
  - `shift_assignments`
  - `attendances`
  - `agenda_entries`
- Dashboard/actividad minima:
  - `activity_events` (solo si se mantiene feed basico)

### Tablas que pueden quedar para despues

- `email_verification_tokens`
- `password_reset_tokens`
- `admin_audit_log`
- `documents`
- `certificates`
- `prescription_logs`
- `external_platforms`
- `resident_external_events`
- `finance_categories`
- `finance_transactions`
- `activity_event_saves`
- `audit_log`
- `push_subscriptions`
- `push_preferences`

---

## 6) Dependencias PostgreSQL y externas que impactan migracion

### Acoplamientos a PostgreSQL

- Uso extensivo de UUID de dialecto Postgres (`sqlalchemy.dialects.postgresql.UUID`).
- Uso de `JSONB` (por ejemplo en push/activity/audit).
- SQL raw en startup con sintaxis Postgres (`ALTER TABLE ... IF NOT EXISTS`, `TIMESTAMP WITH TIME ZONE`, `NOW()`, cast `'[]'::jsonb`).
- Sesiones SQLAlchemy sincronas con `psycopg` y `sessionmaker`.

Riesgo: la portabilidad a D1 (SQLite) no es directa. Se necesita rediseñar tipos UUID/JSON y eliminar SQL especifico de Postgres.

### Dependencias externas

- Email SMTP (`smtplib`) para verificacion y reset.
- Cloudinary (`cloudinary`) para almacenamiento/medios.
- PDF (`reportlab`) para certificados e historia clinica.
- Push web (`pywebpush` + VAPID).
- JWT/seguridad (`python-jose`, `passlib`).
- Rate limiting (`slowapi`).

Riesgo: varias de estas piezas agregan complejidad operativa en Workers y no son necesarias para el primer corte MVP.

---

## 7) Funcionalidades que conviene NO migrar en primera version

Para reducir complejidad y acelerar salida de Render:

- Impersonacion y administracion avanzada (`/admin/*`).
- Generacion de PDFs (certificados e historia clinica en PDF).
- Push notifications completas (`/push/*`).
- Soporte por bug-report con pipeline de email.
- Integraciones externas (`/external-platforms`, `external-events`).
- Finanzas completas (si no son criticas en operacion diaria inmediata).
- Documentos avanzados y almacenamiento asociado.
- Activity "saved"/expirable y auditoria completa.

Objetivo: mantener solo el backend necesario para funcionamiento diario del frontend principal.

---

## 8) Orden recomendado de migracion a Workers + D1

### Fase 1: auth + facilities + residents

- Implementar autenticacion base (`/auth/login`, `/auth/me`, perfil minimo).
- Implementar facilities (`/facilities*`) y residentes/contactos (`/residents*`, `/residents/{id}/contacts*`).
- Migrar tablas core de usuarios/facilities/residentes.

### Fase 2: clinical + medications

- Clinical summary/notes (sin PDF en primera iteracion).
- Medication plans, horarios, administraciones y due por facility.
- Migrar tablas clinicas y de medicacion.

### Fase 3: staff + shifts + attendance + agenda

- Operacion diaria de personal y turnos.
- Check-in/check-out y reporte minimo.
- Agenda diaria.

### Fase 4: dashboard basico + activity minima

- `GET /dashboard/summary` para vista principal.
- Feed basico de actividad (`GET /activity`) si es necesario para UX.

### Fase 5: certificados PDF, push, soporte, finanzas, integraciones externas si realmente se usan

- Reintroducir solo componentes con uso validado en produccion.
- Evaluar costo/beneficio antes de migrar cada modulo.

---

## 9) Decision operativa para apagar Render (criterio practico)

Se puede planificar apagado de Render cuando en Cloudflare Workers + D1 esten cubiertos, con pruebas de smoke, al menos:

- Auth base + facilities + residents + contacts.
- Clinical summary/notes.
- Medications operativas.
- Staff/shifts/attendance/agenda.
- Dashboard basico necesario para home.

Todo lo demas puede quedar temporalmente en backlog de migracion, siempre que no impacte el flujo principal del frontend actual.
