"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from backend.audit import log_audit
from backend.database import get_db
from backend.models import AuditLog, Institution, Role, User
from backend.rbac import RBAC_MATRIX, require_permission
from backend.schemas import ProfessionalDecisionRequest, UserCreateRequest, UserUpdateRequest
from backend.security import hash_password

router = APIRouter(prefix="/api/v1/admin", tags=["Administración Master, Autorización de Profesionales y Auditoría"])


def _serialize_admin_user(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "role_code": u.role.code if u.role else "",
        "role_name": u.role.display_name if u.role else "",
        "professional_license": u.professional_license,
        "specialty": u.specialty,
        "curp": u.curp,
        "rfc": u.rfc,
        "birth_date": u.birth_date.isoformat() if u.birth_date else None,
        "phone": u.phone,
        "address": u.address,
        "university": u.university,
        "graduation_year": u.graduation_year,
        "experience_years": u.experience_years,
        "bio": u.bio,
        "documents_json": u.documents_json or [],
        "default_signature_data": u.default_signature_data,
        "approval_status": u.approval_status or "APPROVED",
        "rejection_reason": u.rejection_reason,
        "approved_at": u.approved_at.isoformat() if u.approved_at else None,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
    }


@router.get("/users")
def list_users(
    current_user: User = Depends(require_permission("admin", "full")),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.institution_id == current_user.institution_id)
        .order_by(User.created_at.desc())
        .all()
    )
    serialized = [_serialize_admin_user(u) for u in users]
    pending = [u for u in serialized if u["approval_status"] == "PENDING"]
    return {
        "users": serialized,
        "pending_professionals": pending,
        "pending_count": len(pending),
        "rbac_matrix": RBAC_MATRIX,
    }


@router.get("/professionals")
def list_professionals(
    approval_status: str | None = Query(default=None, description="PENDING | APPROVED | REJECTED"),
    current_user: User = Depends(require_permission("admin", "full")),
    db: Session = Depends(get_db),
):
    """Lista los profesionales registrados con sus documentos adjuntos para revisión del Master."""
    query = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.institution_id == current_user.institution_id, User.username != "abun")
    )
    if approval_status and approval_status.upper() in {"PENDING", "APPROVED", "REJECTED"}:
        query = query.filter(User.approval_status == approval_status.upper())

    rows = query.order_by(User.created_at.desc()).all()
    items = [_serialize_admin_user(u) for u in rows]
    return {
        "count": len(items),
        "pending_count": sum(1 for x in items if x["approval_status"] == "PENDING"),
        "professionals": items,
    }


@router.post("/professionals/{user_id}/approve")
def approve_professional(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_permission("admin", "full")),
    db: Session = Depends(get_db),
):
    """Autoriza el registro de un profesional para que pueda operar el sistema."""
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == user_id, User.institution_id == current_user.institution_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Registro de profesional no encontrado.")

    user.approval_status = "APPROVED"
    user.is_active = True
    user.rejection_reason = None
    user.approved_by_user_id = current_user.id
    user.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    log_audit(
        db,
        action="APPROVE_PROFESSIONAL",
        table_name="users",
        record_id=user.id,
        details=f"Registro profesional AUTORIZADO: {user.full_name} ({user.role.display_name if user.role else ''})",
        user=current_user,
        request=request,
    )
    return {"status": "approved", "id": user.id, "full_name": user.full_name}


@router.post("/professionals/{user_id}/reject")
def reject_professional(
    user_id: int,
    payload: ProfessionalDecisionRequest,
    request: Request,
    current_user: User = Depends(require_permission("admin", "full")),
    db: Session = Depends(get_db),
):
    """Rechaza o suspende una solicitud de registro profesional."""
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == user_id, User.institution_id == current_user.institution_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Registro de profesional no encontrado.")

    user.approval_status = "REJECTED"
    user.is_active = False
    user.rejection_reason = payload.reason.strip() if payload.reason else "Documentación incompleta o no validada."
    db.commit()

    log_audit(
        db,
        action="REJECT_PROFESSIONAL",
        table_name="users",
        record_id=user.id,
        details=f"Registro profesional RECHAZADO: {user.full_name} — {user.rejection_reason}",
        user=current_user,
        request=request,
    )
    return {"status": "rejected", "id": user.id}


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    request: Request,
    current_user: User = Depends(require_permission("admin", "full")),
    db: Session = Depends(get_db),
):
    role = (
        db.query(Role)
        .filter(Role.institution_id == current_user.institution_id, Role.code == payload.role_code.upper())
        .first()
    )
    if not role:
        raise HTTPException(status_code=400, detail="Código de rol RBAC no válido.")

    exists = (
        db.query(User)
        .filter((User.email == payload.email.lower()) | (User.username == payload.username.lower()))
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="El correo electrónico o nombre de usuario ya está registrado.")

    new_user = User(
        institution_id=current_user.institution_id,
        role_id=role.id,
        username=payload.username.strip().lower(),
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        professional_license=payload.professional_license,
        specialty=payload.specialty,
        approval_status="APPROVED",
        approved_by_user_id=current_user.id,
        approved_at=datetime.now(timezone.utc).replace(tzinfo=None),
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit(
        db,
        action="ADMIN_CREATE_USER",
        table_name="users",
        record_id=new_user.id,
        details=f"Usuario creado directamente por Master: {new_user.username} ({role.code})",
        user=current_user,
        request=request,
    )
    return {"status": "created", "id": new_user.id, "username": new_user.username}


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    request: Request,
    current_user: User = Depends(require_permission("admin", "full")),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id, User.institution_id == current_user.institution_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if payload.role_code:
        role = (
            db.query(Role)
            .filter(Role.institution_id == current_user.institution_id, Role.code == payload.role_code.upper())
            .first()
        )
        if not role:
            raise HTTPException(status_code=400, detail="Rol no válido.")
        user.role_id = role.id

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.professional_license is not None:
        user.professional_license = payload.professional_license
    if payload.specialty is not None:
        user.specialty = payload.specialty
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.approval_status is not None:
        user.approval_status = payload.approval_status
    if payload.password:
        user.password_hash = hash_password(payload.password)

    db.commit()

    log_audit(
        db,
        action="ADMIN_UPDATE_USER",
        table_name="users",
        record_id=user.id,
        details=f"Actualización administrativa de usuario {user.username}",
        user=current_user,
        request=request,
    )
    return {"status": "updated", "id": user.id}


@router.get("/audit-logs")
def get_audit_logs(
    action: str | None = Query(default=None),
    table_name: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(require_permission("admin", "full")),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).filter(AuditLog.institution_id == current_user.institution_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if table_name:
        query = query.filter(AuditLog.table_name.ilike(f"%{table_name}%"))

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return {
        "count": len(logs),
        "immutable": True,
        "logs": [
            {
                "id": l.id,
                "user_id": l.user_id,
                "role": l.role,
                "action": l.action,
                "table_name": l.table_name,
                "record_id": l.record_id,
                "details": l.details,
                "ip_address": l.ip_address,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ],
    }


@router.get("/institution")
def get_institution(
    current_user: User = Depends(require_permission("admin", "full")),
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institución no configurada.")
    return {
        "id": inst.id,
        "code": inst.code,
        "name": inst.name,
        "legal_name": inst.legal_name,
        "city": inst.city,
        "state": inst.state,
        "country": inst.country,
        "website": inst.website,
        "domain": inst.domain,
        "phone": inst.phone,
        "email": inst.email,
        "address": inst.address,
    }
