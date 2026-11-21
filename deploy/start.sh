#!/usr/bin/env bash
# ==============================================================================
# @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
# @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
# @author      César Augusto Bravo Hernández
# @role        CESAR A. BRAVO - DevRel @Google
# @contact     cesarbraher@gmail.com | https://cebraher.com
# @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
# ==============================================================================

set -euo pipefail

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

if [ -x ".venv/bin/uvicorn" ]; then
  exec .venv/bin/uvicorn backend.main:app --host "$HOST" --port "$PORT" --proxy-headers
else
  exec uvicorn backend.main:app --host "$HOST" --port "$PORT" --proxy-headers
fi
