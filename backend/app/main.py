from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.api.routes import (
    auth, facilities, residents, resident_contacts, clinical, medications,
    documents, certificates, external_platforms, resident_external_events, finance,
    staff, attendance, admin
)
from app.db.session import SessionLocal
from app.db.bootstrap import bootstrap_production_users
import logging

logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Plataforma Geriátricos API",
    description="API para gestión de 3 geriátricos (MVP)",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Configurado INMEDIATAMENTE después de crear la app y ANTES de routers/startup
# para que funcione en todos los endpoints, incluyendo respuestas de error (401, 403, 500, etc.)
# Leer env vars: CORS_ORIGINS (CSV), CORS_ORIGIN_REGEX, CORS_ALLOW_CREDENTIALS
import os
cors_origins_str = os.getenv("CORS_ORIGINS", "").strip()
cors_origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip()
cors_allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "true").strip().lower() == "true"

# Parsear CORS_ORIGINS (CSV)
cors_origins = []
if cors_origins_str:
    cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

# Si no hay env vars, intentar usar settings (para compatibilidad)
if not cors_origins and not cors_origin_regex:
    cors_origins = settings.cors_origins_list
    cors_origin_regex = settings.cors_origin_regex

# Fallback seguro: si tanto origins como regex están vacíos, usar regex para Vercel previews
# Esto asegura que nunca quede sin CORS por falta de env vars
if not cors_origin_regex and (not cors_origins or len(cors_origins) == 0):
    cors_origin_regex = r"^https://.*\.vercel\.app$"
    logger.warning("CORS: No hay configuración de CORS. Usando fallback seguro para Vercel previews.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else [],
    allow_origin_regex=cors_origin_regex,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints básicos
@app.get("/")
async def root():
    """Endpoint de bienvenida con información básica de la API"""
    return {
        "name": "Geriatricos API",
        "status": "ok",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


# Catch-all exception handler para asegurar que CORS se aplique SIEMPRE, incluso en errores 500
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handler global que captura cualquier excepción no manejada.
    
    Esto asegura que los errores 500 siempre pasen por los middlewares de CORS
    y retornen respuestas JSON con headers CORS correctos.
    """
    # Loguear el error real con stacktrace para diagnóstico
    logger.exception(f"Excepción no manejada en {request.method} {request.url}: {exc}")
    
    # Retornar JSONResponse para que CORS se aplique
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal Server Error"}
    )


# Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(facilities.router)
app.include_router(residents.router)
app.include_router(resident_contacts.router)
app.include_router(clinical.router)
app.include_router(medications.router)
app.include_router(documents.router)
app.include_router(certificates.router)
app.include_router(external_platforms.router)
app.include_router(resident_external_events.router)
app.include_router(finance.router)
app.include_router(staff.router)
app.include_router(attendance.router)


@app.on_event("startup")
async def startup_event():
    """Ejecutar bootstrap de usuarios de producción al iniciar la aplicación"""
    try:
        # Solo ejecutar bootstrap si hay variables de entorno definidas
        has_admin = settings.ADMIN_DNI and settings.ADMIN_PASSWORD
        has_medico = settings.MEDICO_DNI and settings.MEDICO_PASSWORD
        
        if has_admin or has_medico:
            logger.info("Bootstrap: Variables de entorno detectadas. Ejecutando bootstrap de usuarios...")
            db = SessionLocal()
            try:
                bootstrap_production_users(db)
            except Exception as e:
                logger.error(f"Bootstrap: Error al crear usuarios de producción: {e}", exc_info=True)
                # No fallar el startup si hay error en bootstrap
            finally:
                db.close()
        else:
            logger.info("Bootstrap: No hay variables de entorno de bootstrap. Saltando creación automática de usuarios.")
            logger.info("Bootstrap: Para crear usuarios, definir ADMIN_DNI/ADMIN_PASSWORD o MEDICO_DNI/MEDICO_PASSWORD")
    except Exception as e:
        logger.error(f"Bootstrap: Error en startup event: {e}", exc_info=True)
        # No fallar el startup si hay error
