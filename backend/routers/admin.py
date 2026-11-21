"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from backend.audit import log_audit
from backend.database import get_db
from backend.models import AuditLog, Institution, Role, User
from backend.rbac import RBAC_MATRIX, require_permission
from backend.schemas import UserCreateRequest, UserUpdateRequest
from backend.security import hash_password

router = APIRouter(prefix="/api/v1/admin", tags=["Administración y Auditoría Inmutable (Solo ADMIN)"])


@router.get("/users")
def list_users(
    current_user: User = Depends(require_permission("admin", "full")),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.institution_id == current_user.institution_id)
        .order_by(User.id.asc())
        .all()
    )
    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "full_name": u.full_name,
                "role_code": u.role.code if u.role else "",
                "role_name": u.role.display_name if u.role else "",
                "professional_license": u.professional_license,
                "specialty": u.specialty,
                "is_active": u.is_active,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in users
        ],
        "rbac_matrix": RBAC_MATRIX,
    }


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
        details=f"Usuario creado: {new_user.username} ({role.code})",
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
