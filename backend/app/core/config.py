from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # CORS (opcional - si no está definida usa defaults)
    CORS_ORIGINS: Optional[str] = None
    
    # Storage
    STORAGE_PROVIDER: str = "local"
    STORAGE_BASE_URL: str = "http://localhost:8000/storage"
    
    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list, con defaults para desarrollo si no está definida"""
        # Defaults para desarrollo local
        default_origins = ["http://localhost:5173", "http://localhost:4173"]
        
        # Si CORS_ORIGINS no está definida o está vacía, usar defaults
        if not self.CORS_ORIGINS or not self.CORS_ORIGINS.strip():
            return default_origins
        
        # Parsear la lista separada por comas
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        
        # Si después de parsear está vacía, usar defaults
        if not origins:
            return default_origins
        
        return origins
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
