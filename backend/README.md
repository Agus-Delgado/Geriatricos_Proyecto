# Plataforma Geriátricos - Backend API

API backend para gestión de 3 geriátricos (MVP) desarrollada con FastAPI, SQLAlchemy 2.0 y PostgreSQL.

## Stack Tecnológico

- **Framework**: FastAPI 0.104+
- **ORM**: SQLAlchemy 2.0
- **Migraciones**: Alembic
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT (python-jose)
- **Hashing**: bcrypt (passlib)

## Setup Local

### Prerrequisitos

- Python 3.10+
- PostgreSQL 12+
- pip

### Instalación

1. **Clonar el repositorio y entrar al directorio backend:**
   ```bash
   cd backend
   ```

2. **Crear entorno virtual:**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno:**
   
   Copiar `.env.example` a `.env` y configurar:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/geriatricos_db
   JWT_SECRET=your-secret-key-change-in-production
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   CORS_ORIGINS=http://localhost:5173,http://localhost:4173
   ```
   
   **Nota sobre CORS_ORIGINS**: Esta variable es **opcional**. Si no se define, se usan valores por defecto para desarrollo local (`http://localhost:5173`, `http://localhost:4173`). Además, los previews de Vercel (URLs que terminan en `.vercel.app`) se permiten automáticamente mediante regex.

5. **Crear base de datos PostgreSQL:**
   ```sql
   CREATE DATABASE geriatricos_db;
   ```

6. **Aplicar migraciones:**
   ```bash
   alembic upgrade head
   ```

7. **Ejecutar seeds (datos iniciales):**
   ```bash
   python -m app.db.seeds
   ```

   Esto creará:
   - 1 grupo propietario: "Grupo Geriátricos"
   - 3 sedes: G1, G2, G3
   - Roles: OWNER, DOCTOR
   - 3 usuarios:
     - owner1@geriatricos.com / owner123
     - owner2@geriatricos.com / owner123
     - doctor@geriatricos.com / doctor123
   - Accesos: los 3 usuarios tienen acceso a las 3 sedes
   - Categorías de finanzas (7 expense + 3 income)

8. **Iniciar servidor:**
   ```bash
   uvicorn app.main:app --reload
   ```

   La API estará disponible en: `http://localhost:8000`
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

## Estructura del Proyecto

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py          # Dependencias (auth, roles, facility scoping)
│   │   └── routes/          # Endpoints por módulo
│   ├── core/
│   │   ├── config.py        # Configuración desde .env
│   │   └── security.py      # JWT + password hashing
│   ├── db/
│   │   ├── base.py          # Base declarativa SQLAlchemy
│   │   ├── session.py       # SessionLocal + get_db
│   │   └── seeds.py         # Script de datos iniciales
│   ├── models/              # Modelos ORM (21 tablas)
│   ├── schemas/             # Schemas Pydantic
│   ├── services/            # Lógica de negocio
│   └── main.py              # FastAPI app
├── migrations/              # Migraciones Alembic
├── tests/                   # Tests
├── alembic.ini              # Configuración Alembic
├── requirements.txt         # Dependencias Python
└── README.md
```

## Base de Datos

### Tablas Principales (21 tablas)

- **Auth**: users, user_roles, user_role_assignments
- **Organización**: owner_groups, facilities, facility_user_access
- **Residentes**: residents, resident_contacts
- **Clínica**: clinical_summaries, clinical_notes, vital_signs
- **Medicación**: medication_plans, medication_schedule_times, medication_administrations
- **Documentos**: documents
- **Certificados**: certificates
- **Plataformas Externas**: external_platforms, resident_external_events
- **Finanzas**: finance_categories, finance_transactions
- **Auditoría**: audit_log

### Convenios Importantes

- **Campos de finalización de estadía**: `stay_status`, `end_date`, `end_reason` (NO usar "death_date")
- **Primary Keys**: UUID
- **Timestamps**: UTC con timezone
- **Auditoría**: created_by_user_id, updated_by_user_id donde aplica

## Migraciones

### Crear nueva migración:
```bash
alembic revision --autogenerate -m "descripcion"
```

### Aplicar migraciones:
```bash
alembic upgrade head
```

### Revertir última migración:
```bash
alembic downgrade -1
```

## Seeds

Para ejecutar los seeds nuevamente (idempotente):
```bash
python -m app.db.seeds
```

**Nota**: Los seeds son idempotentes - no duplicarán datos si ya existen.

## Crear Usuarios Adicionales

Puedes crear usuarios adicionales directamente en la base de datos o mediante un script:

```python
from app.db.session import SessionLocal
from app.models.auth import User, UserRole, UserRoleAssignment
from app.core.security import get_password_hash

db = SessionLocal()
# ... crear usuario y asignar roles
```

## Endpoints Principales

- `GET /health` - Healthcheck
- `POST /auth/login` - Login (DNI o email + password)
- `GET /auth/me` - Usuario actual
- `GET /facilities` - Lista de sedes accesibles
- `GET /residents` - Lista de residentes (filtrado por facility_id)
- ... (ver Swagger UI para lista completa)

## Permisos MVP

- **OWNER** y **DOCTOR**: acceso a las 3 sedes
- Todos los endpoints filtran por `facility_id` cuando corresponde
- Auditoría en acciones críticas

## Desarrollo

### Tests

```bash
# Instalar dependencias de desarrollo
pip install pytest pytest-asyncio httpx

# Ejecutar tests
pytest

# Ejecutar tests con cobertura
pytest --cov=app tests/
```

### Linting

```bash
# Instalar herramientas
pip install black flake8

# Formatear código
black app/

# Verificar estilo
flake8 app/
```

## Validaciones y Seguridad

- **Rate Limiting**: Login limitado a 5 intentos por minuto por IP
- **Validaciones Pydantic**: 
  - Montos financieros deben ser > 0
  - Fechas coherentes (end_date >= admission_date)
  - Enums validados (stay_status, end_reason, etc.)
- **Facility Scoping**: Todos los endpoints validan acceso a la sede
- **Auditoría**: Acciones críticas registradas en audit_log

## Límites y Configuración

- **Upload de documentos**: Preparado para límites de tamaño (configurar en storage provider)
- **Tokens JWT**: Expiración configurable (default: 1440 minutos)
- **CORS**: 
  - Variable `CORS_ORIGINS` es opcional (lista separada por comas)
  - Si no se define, usa defaults: `http://localhost:5173`, `http://localhost:4173`
  - Previews de Vercel (`.vercel.app`) se permiten automáticamente
  - En producción, definir `CORS_ORIGINS` con la URL de tu frontend

## Solución de Problemas

### Error: UnicodeDecodeError con psycopg2 en Windows

Si encuentras el error `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xf3 in position 85` al intentar conectar a PostgreSQL, esto es un problema conocido de psycopg2 en Windows cuando la ruta del proyecto contiene caracteres especiales (como "ó" en "Proyectos").

**Soluciones:**

1. **Mover el proyecto a una ruta sin caracteres especiales:**
   ```
   C:\Users\augus\Desktop\Proyectos\Geriatricos_proyecto\backend
   ```
   (Reemplazar espacios y caracteres especiales con guiones bajos)

2. **Usar SQLite temporalmente para desarrollo:**
   ```env
   DATABASE_URL=sqlite:///./geriatricos.db
   ```
   Nota: SQLite tiene limitaciones pero funciona para desarrollo local.

3. **Verificar que PostgreSQL esté corriendo:**
   ```bash
   # En Windows, verificar servicio
   services.msc
   # Buscar "postgresql" y verificar que esté "En ejecución"
   ```

### Errores de Importación de Modelos

Si encuentras errores como `TypeError: 'Column' object is not callable` o `InvalidRequestError: Attribute name 'metadata' is reserved`:

- ✅ **Resuelto**: Los campos `relationship` y `metadata` han sido renombrados a `relationship_type` y `metadata_json` respectivamente para evitar conflictos con palabras reservadas de SQLAlchemy.

## Notas de Producción

⚠️ **IMPORTANTE**:
- Cambiar `JWT_SECRET` en producción
- Cambiar passwords temporales de usuarios seed
- Configurar `CORS_ORIGINS` en producción con la URL de tu frontend (ej: `https://tu-frontend.vercel.app`)
- Usar variables de entorno seguras
- Los previews de Vercel se permiten automáticamente (no es necesario agregarlos a `CORS_ORIGINS`)
- Configurar storage real (S3/R2/Cloudinary) para documentos y certificados
- Implementar rate limiting en producción
- Configurar backups de base de datos
- **Evitar rutas con caracteres especiales en producción** (usar rutas simples)

## Licencia

[Especificar licencia]
