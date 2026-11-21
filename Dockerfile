# ==============================================================================
# @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
# @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
# @author      César Augusto Bravo Hernández
# @role        CESAR A. BRAVO - DevRel @Google
# @contact     cesarbraher@gmail.com | https://cebraher.com
# @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
# ==============================================================================

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY index.html ./index.html
COPY angeles/ ./angeles/
COPY database/ ./database/

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
