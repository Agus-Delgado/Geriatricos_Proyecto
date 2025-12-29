# Plataforma de Gestión para Geriátricos

Sistema completo de gestión para hogares geriátricos desarrollado con arquitectura moderna, incluyendo backend API REST y frontend Progressive Web App (PWA) mobile-first.

## 📋 Descripción del Proyecto

Esta plataforma está diseñada para facilitar la gestión integral de uno o múltiples hogares geriátricos, permitiendo a propietarios y profesionales de la salud administrar residentes, historiales clínicos, medicaciones, contactos de emergencia, documentos y finanzas desde una aplicación móvil moderna y fácil de usar.

### Propósito y Destinatarios

El sistema está destinado a:

- **Propietarios y Administradores** de hogares geriátricos que necesitan gestionar múltiples sedes y controlar aspectos financieros y administrativos
- **Profesionales de la Salud** (doctores, enfermeros) que requieren acceso rápido a información clínica, planes de medicación y administración de tratamientos
- **Personal Administrativo** que gestiona datos de residentes, contactos de emergencia y documentación

## 🎯 Características Principales

### Gestión de Residentes
- Registro completo de información personal y médica
- Historial de admisiones y estadías
- Estados de estadía (activo, finalizado)
- Gestión de contactos de emergencia

### Gestión Clínica
- Resúmenes clínicos con diagnósticos principales y secundarios
- Notas clínicas (evoluciones, incidentes, observaciones)
- Historial médico y familiar
- Registro de alergias y medicaciones actuales

### Gestión de Medicaciones
- Planes de medicación con dosificación y frecuencia
- Horarios personalizados (diarios o por día de la semana)
- Administraciones registradas
- Vista de medicaciones pendientes del día

### Gestión Financiera (Solo OWNER)
- Categorización de gastos e ingresos
- Registro de transacciones con múltiples métodos de pago
- Soporte para múltiples monedas (ARS, USD)
- Control financiero por sede

### Documentos y Certificados
- Almacenamiento de documentos asociados a residentes
- Gestión de certificados médicos y administrativos

### Seguridad y Control de Acceso
- Autenticación JWT segura
- Control de acceso basado en roles (OWNER, DOCTOR)
- Multi-sede con acceso controlado por usuario
- Auditoría de acciones críticas

### Progressive Web App (PWA)
- Instalable como aplicación nativa
- Funcionamiento offline
- Actualizaciones automáticas con notificación al usuario
- Optimizada para dispositivos móviles

## 🏗️ Arquitectura del Proyecto

El proyecto está dividido en dos componentes principales:

### Backend API (`/backend`)
API REST desarrollada con FastAPI que proporciona todos los endpoints necesarios para la gestión del sistema.

**Stack Tecnológico:**
- **Framework**: FastAPI 0.104+
- **ORM**: SQLAlchemy 2.0
- **Base de Datos**: PostgreSQL 12+
- **Migraciones**: Alembic
- **Autenticación**: JWT (python-jose)
- **Hashing**: bcrypt (passlib)
- **Rate Limiting**: slowapi

### Frontend PWA (`/frontend`)
Aplicación web progresiva desarrollada con React y TypeScript, optimizada para móviles.

**Stack Tecnológico:**
- **Framework**: React 18.2+
- **Lenguaje**: TypeScript 5.2+
- **Build Tool**: Vite 5.0+
- **Estilos**: Tailwind CSS 3.3+
- **Routing**: React Router 6.20+
- **PWA**: vite-plugin-pwa

## 📁 Estructura del Proyecto

```
Geriatricos_proyecto/
├── backend/                 # API Backend (FastAPI)
│   ├── app/
│   │   ├── api/            # Endpoints y dependencias
│   │   ├── core/           # Configuración y seguridad
│   │   ├── db/             # Base de datos y seeds
│   │   ├── models/         # Modelos SQLAlchemy (21 tablas)
│   │   ├── schemas/        # Schemas Pydantic
│   │   ├── services/       # Lógica de negocio
│   │   └── main.py         # Aplicación FastAPI
│   ├── migrations/         # Migraciones Alembic
│   ├── tests/              # Tests
│   ├── requirements.txt    # Dependencias Python
│   └── README.md           # Documentación backend
│
├── frontend/               # Frontend PWA (React + TypeScript)
│   ├── src/
│   │   ├── api/           # Cliente HTTP y servicios API
│   │   ├── components/    # Componentes React
│   │   ├── contexts/      # Context API (Auth, Facility, PWA)
│   │   ├── pages/         # Páginas/rutas
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utilidades
│   │   └── main.tsx       # Entry point
│   ├── public/            # Archivos estáticos y PWA
│   ├── package.json       # Dependencias Node.js
│   ├── vite.config.ts     # Configuración Vite y PWA
│   ├── vercel.json        # Configuración para deploy en Vercel
│   └── README.md          # Documentación frontend
│
└── README.md              # Este archivo
```

## 🗄️ Base de Datos

El sistema utiliza PostgreSQL con 21 tablas organizadas en los siguientes módulos:

- **Autenticación**: users, user_roles, user_role_assignments
- **Organización**: owner_groups, facilities, facility_user_access
- **Residentes**: residents, resident_contacts
- **Clínica**: clinical_summaries, clinical_notes, vital_signs
- **Medicación**: medication_plans, medication_schedule_times, medication_administrations
- **Documentos**: documents
- **Certificados**: certificates
- **Plataformas Externas**: external_platforms, resident_external_events
- **Finanzas**: finance_categories, finance_transactions
- **Auditoría**: audit_log

## 🚀 Inicio Rápido

### Prerrequisitos

- **Backend**: Python 3.10+, PostgreSQL 12+, pip
- **Frontend**: Node.js 18+, npm (o yarn/pnpm)

### Instalación del Backend

1. Navegar al directorio backend:
   ```bash
   cd backend
   ```

2. Crear entorno virtual:
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```

4. Configurar variables de entorno:
   - Copiar `.env.example` a `.env` y configurar:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/geriatricos_db
   JWT_SECRET=your-secret-key-change-in-production
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   CORS_ORIGINS=http://localhost:5173
   ```

5. Crear base de datos PostgreSQL:
   ```sql
   CREATE DATABASE geriatricos_db;
   ```

6. Aplicar migraciones:
   ```bash
   alembic upgrade head
   ```

7. Ejecutar seeds (datos iniciales):
   ```bash
   python -m app.db.seeds
   ```

8. Iniciar servidor:
   ```bash
   uvicorn app.main:app --reload
   ```

   La API estará disponible en `http://localhost:8000`
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### Instalación del Frontend

1. Navegar al directorio frontend:
   ```bash
   cd frontend
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   - Copiar `.env.example` a `.env` y configurar:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:5173`

## 👥 Usuarios Iniciales (Seeds)

Después de ejecutar los seeds, se crean los siguientes usuarios:

- **owner1@geriatricos.com** / password: `owner123` (Rol: OWNER)
- **owner2@geriatricos.com** / password: `owner123` (Rol: OWNER)
- **doctor@geriatricos.com** / password: `doctor123` (Rol: DOCTOR)

Todos los usuarios tienen acceso a las 3 sedes iniciales (G1, G2, G3).

## 🔐 Roles y Permisos

### OWNER (Propietario)
- Acceso completo a todas las funcionalidades
- Gestión financiera (gastos e ingresos)
- Gestión de usuarios y accesos
- Visualización de todas las sedes

### DOCTOR (Doctor)
- Gestión clínica de residentes
- Notas clínicas y resúmenes médicos
- Planes de medicación
- Sin acceso a funciones financieras

## 🌐 Deploy

### Backend

El backend puede ser desplegado en cualquier plataforma que soporte Python y PostgreSQL (Heroku, Railway, DigitalOcean, AWS, etc.).

### Frontend

El frontend está configurado para deploy en Vercel. Ver `frontend/README.md` para instrucciones detalladas.

**Configuración en Vercel:**
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Framework Preset: Vite

**Variables de entorno requeridas:**
- `VITE_API_BASE_URL`: URL del backend API en producción
- `VITE_MISRX_URL`: URL de MisRX para recetas (ej: `https://misrx.com.ar`)
- `VITE_RECETO_URL`: URL de Receto para recetas (ej: `https://receto.com.ar`)
- `VITE_PAMI_URL`: URL de PAMI (ej: `https://www.pami.org.ar`)

**Nota:** Si las variables de entorno de links médicos no están configuradas o son inválidas, los botones correspondientes se mostrarán deshabilitados con un mensaje indicando que deben configurarse en Vercel.

## 📚 Documentación Adicional

- **Backend**: Ver `backend/README.md` para documentación completa de la API
- **Frontend**: Ver `frontend/README.md` para documentación del frontend
- **Troubleshooting**: Ver `backend/TROUBLESHOOTING.md` para soluciones a problemas comunes

## 🛠️ Tecnologías Utilizadas

### Backend
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL
- Alembic
- JWT (python-jose)
- bcrypt (passlib)
- Pydantic
- slowapi

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- vite-plugin-pwa

## 📝 Estado del Proyecto

Este es un proyecto MVP (Minimum Viable Product) desarrollado para gestionar 3 geriátricos inicialmente, con arquitectura escalable para crecer según las necesidades.

### Funcionalidades Implementadas ✅
- ✅ Autenticación y autorización
- ✅ Gestión multi-sede
- ✅ Gestión completa de residentes
- ✅ Historiales clínicos y notas
- ✅ Planes de medicación y administraciones
- ✅ Gestión de contactos de emergencia
- ✅ Sistema financiero (gastos e ingresos)
- ✅ Documentos y certificados (estructura base)
- ✅ PWA con funcionalidad offline
- ✅ Sistema de actualizaciones PWA

### Próximas Mejoras 🔜
- [ ] Funcionalidad completa de Documentos
- [ ] Funcionalidad completa de Certificados
- [ ] Notificaciones push
- [ ] Modo offline mejorado
- [ ] Tests unitarios e integración
- [ ] Reportes y estadísticas
- [ ] Exportación de datos

## 👨‍💻 Desarrollo

### Estructura de Commits

Se recomienda seguir el formato:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bugs
- `docs`: Documentación
- `style`: Formato, punto y coma faltante, etc.
- `refactor`: Refactorización de código
- `test`: Agregar tests
- `chore`: Actualización de tareas de build, configuración, etc.

### Testing

Para ejecutar tests del backend:
```bash
cd backend
pytest
```

## 📄 Licencia

Este proyecto es privado y está destinado exclusivamente para uso interno.

## 🤝 Contribución

Este es un proyecto interno. Para contribuir, por favor contactar con el equipo de desarrollo.

## 📧 Contacto

Para preguntas o soporte, contactar con el equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: 2024
