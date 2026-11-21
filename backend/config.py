"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

import os
from functools import lru_cache
from urllib.parse import quote_plus
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración centralizada vía variables de entorno (.env)."""

    APP_NAME: str = "ANGELES"
    APP_VERSION: str = "1.0-BETA"
    APP_ENV: str = "beta"
    APP_DOMAIN: str = "https://cebraher.org/angeles"
    APP_AUTHOR: str = "César Augusto Bravo Hernández"
    APP_ROLE: str = "CESAR A. BRAVO - DevRel @Google"
    APP_AUTHOR_EMAIL: str = "cesarbraher@gmail.com"
    APP_AUTHOR_WEB: str = "https://cebraher.com"

    # Base de datos (MySQL en producción/beta, SQLite automático si no hay credenciales locales)
    DATABASE_URL: str = ""
    DB_ENGINE: str = "sqlite"
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "u529127178_adulam"
    DB_USER: str = "u529127178_angeles"
    DB_PASSWORD: str = ""

    # Seguridad JWT
    JWT_SECRET_KEY: str = "angeles-beta-local-dev-change-in-production-256bit-key-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    INACTIVITY_TIMEOUT_MINUTES: int = 20

    # Google Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # CORS
    CORS_ORIGINS: str = (
        "https://cebraher.org,https://www.cebraher.org,"
        "https://braher.org,https://www.braher.org,"
        "https://angeles.cebraher.com,https://cebraher.com,"
        "http://localhost:8000,http://127.0.0.1:8000"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def resolved_database_url(self) -> str:
        """Construye la URL SQLAlchemy agnóstica (MySQL, PostgreSQL o SQLite local)."""
        if self.DATABASE_URL:
            return self.DATABASE_URL

        engine = (self.DB_ENGINE or "").strip().lower()
        if engine.startswith("mysql") and self.DB_PASSWORD and self.DB_PASSWORD != "[CONFIGURAR_EN_SERVIDOR_ENV]":
            user_enc = quote_plus(self.DB_USER)
            pass_enc = quote_plus(self.DB_PASSWORD)
            return f"{self.DB_ENGINE}://{user_enc}:{pass_enc}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

        if engine.startswith("postgresql") and self.DB_PASSWORD:
            user_enc = quote_plus(self.DB_USER)
            pass_enc = quote_plus(self.DB_PASSWORD)
            return f"{self.DB_ENGINE}://{user_enc}:{pass_enc}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

        # Respaldo local seguro para pruebas/desarrollo sin MySQL instalado localmente
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(base_dir, "angeles_dev.db")
        return f"sqlite:///{db_path}"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
