"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

from fastapi import Request
from sqlalchemy.orm import Session

from backend.models import AuditLog, User


def extract_client_ip(request: Request | None) -> str:
    """Extrae la IP de origen respetando proxies inversos Nginx/Cloudflare."""
    if not request:
        return "127.0.0.1"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def log_audit(
    db: Session,
    *,
    action: str,
    table_name: str,
    record_id: str | int | None = None,
    details: str | None = None,
    user: User | None = None,
    role_override: str | None = None,
    institution_id: int = 1,
    request: Request | None = None,
) -> AuditLog:
    """Registra una entrada inmutable en `audit_logs` para trazabilidad clínica."""
    role = role_override or (user.role.code if user and user.role else "ANONYMOUS")
    inst_id = user.institution_id if user else institution_id
    entry = AuditLog(
        institution_id=inst_id,
        user_id=user.id if user else None,
        role=role,
        action=action,
        table_name=table_name,
        record_id=str(record_id) if record_id is not None else None,
        details=details,
        ip_address=extract_client_ip(request),
    )
    db.add(entry)
    db.commit()
    return entry
