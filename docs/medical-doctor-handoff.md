# Guía para el médico — Hogares de Cuidado y Cariño

Esta guía explica cómo usar la aplicación médica en el celular o en la computadora. Si algo no funciona, contactá al administrador del sistema.

---

## Cómo ingresar

1. Abrí el enlace que te entregaron (por ejemplo: `https://tu-app.vercel.app`).
2. En la pantalla de ingreso, escribí el **email** y la **contraseña temporal** que te dieron.
3. Tocá **Ingresar**.

> Usá solo las credenciales que te entregó el administrador. No las compartas por WhatsApp u otros chats públicos.

---

## Primer ingreso (importante)

Al entrar por primera vez verás un mensaje de bienvenida con un resumen de las secciones.

Hacé estos dos pasos antes de trabajar con pacientes:

### 1. Ir a **Mi cuenta**

- Tocá el ícono de usuario (arriba a la derecha) → **Mi cuenta**.

### 2. Completar el **DNI**

- Cargá tu DNI (solo números, sin puntos).
- Guardá los cambios.

Así podrás ingresar la próxima vez con **DNI o email**.

### 3. Cambiar la contraseña

En la misma pantalla **Mi cuenta**:

- Escribí la contraseña actual (la temporal).
- Elegí una contraseña nueva (mínimo 8 caracteres).
- Repetila y guardá.

A partir de ahí usá siempre tu contraseña nueva.

---

## Ingresos siguientes

Podés iniciar sesión con:

- Tu **email**, o
- Tu **DNI** (si ya lo cargaste en Mi cuenta),

y tu contraseña.

---

## Pantalla principal (Inicio médico)

Desde el inicio podés ir a:

| Sección | Para qué sirve |
|---------|----------------|
| **Pacientes** | Ver, crear y editar pacientes |
| **Historia clínica** | Resumen y evoluciones |
| **Indicaciones** | Medicación e indicaciones por paciente |
| **Certificados** | Constancias y certificados |
| **Accesos médicos** | Links externos (recetas, PAMI, etc.) si están configurados |

La barra inferior repite estos accesos: **Inicio médico**, **Pacientes**, **Historia clínica**, **Indicaciones**, **Certificados** y **Mi cuenta**.

---

## Pacientes

1. Entrá a **Pacientes** (barra inferior o tarjeta en el inicio).
2. Tocá **Nuevo paciente** y completá los datos.
3. En **Hogar / institución** elegí uno de estos hogares:
   - **Nuestra Señora de Luján**
   - **El Trébol**
   - **El Amanecer**
4. Guardá.

Para buscar o filtrar, usá la barra de búsqueda y el filtro por hogar en la lista.

Para editar un paciente, tocá su nombre en la lista.

---

## Historia clínica y evoluciones

1. Entrá a **Historia clínica**.
2. Buscá al paciente por nombre o DNI.
3. Abrí su ficha.
4. Ahí podés ver el **resumen clínico** y cargar **evoluciones** (notas de seguimiento).

---

## Indicaciones (medicación)

1. Entrá a **Indicaciones** (barra inferior o desde el inicio: *Indicaciones guardadas*).
2. Buscá al paciente.
3. Registrá o consultá las indicaciones y horarios de medicación.

---

## Certificados

1. Entrá a **Certificados**.
2. Elegí el paciente y creá o abrí un certificado.
3. Para **imprimir** o **guardar como PDF**: usá la opción de impresión del navegador (Ctrl+P o menú Compartir → Imprimir → Guardar como PDF).

---

## Accesos médicos externos

En el **Inicio médico**, si el administrador configuró los enlaces, verás accesos rápidos a sitios como recetas electrónicas o PAMI. Si no aparecen, pedile al administrador que los active.

---

## Qué no está en esta aplicación

No vas a encontrar (y no hace falta para tu trabajo diario):

- Finanzas del hogar
- Gestión de personal o turnos
- Panel de administración general

Si entrás por error a una de esas direcciones, la app te mostrará que el módulo no está disponible y podés volver al **Inicio médico**.

---

## Operación mínima (para quien entrega la app)

Solo lectura para el equipo técnico; el médico no necesita esta sección.

### Crear usuario médico inicial

1. En D1 production debe existir **una sede técnica** (`facilities`) y su `id`.
2. Desde `cloudflare-worker/` (PowerShell), sin commitear la contraseña:

```powershell
$env:MEDICAL_USER_EMAIL = "medico@ejemplo.local"
$env:MEDICAL_USER_PASSWORD = "<contraseña-temporal-segura>"
$env:MEDICAL_USER_FACILITY_ID = "<facility-id-de-d1>"
# Opcional: $env:MEDICAL_USER_FULL_NAME = "Dr. Apellido"
# Opcional: $env:MEDICAL_USER_DNI = "12345678"
npx tsx scripts/create-production-medical-user.mjs
npx wrangler d1 execute geriatricos_d1_prod --remote --env production --file medical-user-production-insert.sql
```

3. Entregar email y contraseña temporal al médico por un canal seguro.
4. El archivo `medical-user-production-insert.sql` **no se sube al repositorio**.

Rol en base de datos: `users.role = doctor`, `facility_users.role = medico` (compatible con el Worker).

### Variables en Vercel (frontend)

| Variable | Uso |
|----------|-----|
| `VITE_API_BASE_URL` | URL del Worker production (sin barra final) |
| `VITE_MISRX_URL` | Link externo MisRX (opcional) |
| `VITE_RECETO_URL` | Link externo Receto (opcional) |
| `VITE_PAMI_URL` | Link externo PAMI (opcional) |

Tras cambiar variables: **redeploy** en Vercel.

### Validación antes de entregar

Usar [medical-production-checklist.md](./medical-production-checklist.md).

### Documentos relacionados

- [medical-production-checklist.md](./medical-production-checklist.md) — pruebas en producción
- [medical-app-roadmap.md](./medical-app-roadmap.md) — alcance del producto
- [render-shutdown-checklist.md](./render-shutdown-checklist.md) — baja de Render (infra)

---

## Historial

| Fecha | Evento |
|-------|--------|
| 2026-05-28 | B9 — Guía de entrega al médico |
