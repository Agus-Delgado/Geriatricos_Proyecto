from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.api.routes import (
    auth, facilities, residents, resident_contacts, clinical, medications,
    documents, certificates, external_platforms, resident_external_events, finance,
    staff, attendance
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Plataforma Geriátricos API",
    description="API para gestión de 3 geriátricos (MVP)",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
# Permitir orígenes específicos desde CORS_ORIGINS o defaults
# También permitir previews de Vercel con regex
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https://.*\.vercel\.app$",  # Previews de Vercel
    allow_credentials=True,
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


# Routers
app.include_router(auth.router)
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
