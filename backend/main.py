"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from backend.config import get_settings
from backend.database import Base, SessionLocal, engine
from backend.routers import admin, auth, clinical, dashboard, expansion, patients
from backend.seed import seed_initial_data

settings = get_settings()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_ROOT = BASE_DIR
ANGELES_DIR = os.path.join(BASE_DIR, "angeles")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Inicializa esquema ORM (entornos dev/beta) y datos semilla institucionales."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)",
    description=(
        "API RESTful del Expediente Clínico Electrónico para el Centro de Rehabilitación "
        "en Adicciones Ángeles de Esperanza A.C. (Irapuato, Guanajuato), publicado en "
        "cebraher.org con el sistema ÁNGELES en /angeles. "
        "Desarrollado por César Augusto Bravo Hernández | CESAR A. BRAVO - DevRel @Google (cebraher.com)."
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de Routers API v1
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(patients.router)
app.include_router(clinical.router)
app.include_router(expansion.router)
app.include_router(admin.router)


@app.get("/api/v1/health", tags=["Sistema"])
def health_check():
    """Endpoint de verificación de estado para Cloud Run, Nginx y monitoreo PWA."""
    db_type = "mysql" if "mysql" in settings.resolved_database_url else (
        "postgresql" if "postgresql" in settings.resolved_database_url else "sqlite"
    )
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "database_driver": db_type,
        "portal_root": "FUNDACIÓN BRAHER (cebraher.org)",
        "app_base_path": "/angeles",
        "institution": "Ángeles de Esperanza A.C.",
        "author": settings.APP_AUTHOR,
        "role": settings.APP_ROLE,
        "website": settings.APP_AUTHOR_WEB,
    }


@app.get("/api/v1/app/launcher", tags=["Sistema"])
def download_web_launcher():
    """Descarga un acceso directo multiplataforma (.html) para abrir la PWA ÁNGELES desde el escritorio."""
    target_url = f"{settings.APP_DOMAIN.rstrip('/')}/dashboard"
    html_launcher = f"""<!DOCTYPE html>
<!--
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
-->
<html lang="es-MX">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url={target_url}" />
  <title>Abrir ÁNGELES — Ángeles de Esperanza A.C.</title>
  <style>
    body {{ font-family: system-ui, -apple-system, sans-serif; background:#F8FAFC; color:#0F172A; display:grid; place-items:center; min-height:100vh; margin:0; text-align:center; padding:24px; }}
    .card {{ background:#fff; border:1px solid #E2E8F0; border-radius:16px; padding:32px; max-width:440px; box-shadow:0 12px 30px rgba(15,76,129,.08); }}
    a {{ display:inline-block; margin-top:16px; padding:12px 24px; background:#0F4C81; color:#fff; text-decoration:none; border-radius:10px; font-weight:600; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>ÁNGELES — Acceso Directo</h1>
    <p>Redirigiendo a la aplicación clínica instalada en <strong>{target_url}</strong>...</p>
    <a href="{target_url}">Abrir ÁNGELES ahora</a>
  </div>
</body>
</html>
"""
    return PlainTextResponse(
        content=html_launcher,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="Angeles-App-AccesoDirecto.html"'},
    )


# =============================================================================
# PORTAL RAÍZ (cebraher.org / -> FUNDACIÓN BRAHER)
# =============================================================================
@app.get("/", include_in_schema=False)
def serve_root_landing():
    root_index = os.path.join(FRONTEND_ROOT, "index.html")
    if not os.path.isfile(root_index):
        raise HTTPException(status_code=503, detail="Landing principal no encontrada.")
    return FileResponse(root_index, media_type="text/html")


# =============================================================================
# ARCHIVOS PWA Y ACTIVOS ESTÁTICOS DEL SISTEMA ÁNGELES BAJO /angeles/
# =============================================================================
@app.get("/angeles/manifest.json", include_in_schema=False)
def serve_manifest():
    return FileResponse(
        os.path.join(ANGELES_DIR, "manifest.json"),
        media_type="application/manifest+json",
    )


@app.get("/angeles/sw.js", include_in_schema=False)
def serve_service_worker():
    return FileResponse(
        os.path.join(ANGELES_DIR, "sw.js"),
        media_type="application/javascript",
        headers={"Service-Worker-Allowed": "/angeles/", "Cache-Control": "no-cache"},
    )


@app.get("/angeles/offline.html", include_in_schema=False)
def serve_offline_page():
    return FileResponse(os.path.join(ANGELES_DIR, "offline.html"), media_type="text/html")


if os.path.isdir(ANGELES_DIR):
    app.mount("/angeles/css", StaticFiles(directory=os.path.join(ANGELES_DIR, "css")), name="angeles-css")
    app.mount("/angeles/js", StaticFiles(directory=os.path.join(ANGELES_DIR, "js")), name="angeles-js")
    app.mount("/angeles/assets", StaticFiles(directory=os.path.join(ANGELES_DIR, "assets")), name="angeles-assets")


@app.get("/angeles", include_in_schema=False)
def redirect_angeles_slash():
    return RedirectResponse(url="/angeles/", status_code=307)


@app.get("/angeles/{full_path:path}", include_in_schema=False)
def serve_angeles_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Endpoint API no encontrado.")
    index_path = os.path.join(ANGELES_DIR, "index.html")
    if not os.path.isfile(index_path):
        raise HTTPException(status_code=503, detail="Interfaz ÁNGELES no encontrada.")
    return FileResponse(index_path, media_type="text/html")
