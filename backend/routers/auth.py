"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from backend.audit import log_audit
from backend.config import get_settings
from backend.database import get_db
from backend.models import User
from backend.rbac import get_role_permissions
from backend.schemas import LoginRequest, LoginResponse, UserProfile
from backend.security import create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación y Seguridad JWT"])


def serialize_user_profile(user: User) -> UserProfile:
    role_code = user.role.code if user.role else "UNKNOWN"
    role_name = user.role.display_name if user.role else "Sin rol"
    inst_name = user.institution.name if user.institution else "Ángeles de Esperanza A.C."
    return UserProfile(
        id=user.id,
        institution_id=user.institution_id,
        institution_name=inst_name,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role_code=role_code,
        role_name=role_name,
        professional_license=user.professional_license,
        specialty=user.specialty,
        is_active=user.is_active,
        permissions=get_role_permissions(role_code),
        last_login_at=user.last_login_at,
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Autentica al personal por correo o usuario, emite JWT y registra auditoría."""
    identifier = payload.identifier.strip().lower()
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.institution))
        .filter(or_(User.email.ilike(identifier), User.username.ilike(identifier)))
        .first()
    )

    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        log_audit(
            db,
            action="LOGIN_FAILED",
            table_name="users",
            record_id=identifier,
            details="Intento fallido de inicio de sesión",
            role_override="ANONYMOUS",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas o cuenta inactiva.",
        )

    user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    settings = get_settings()
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.code if user.role else "UNKNOWN",
            "institution_id": user.institution_id,
        }
    )

    log_audit(
        db,
        action="LOGIN_SUCCESS",
        table_name="users",
        record_id=user.id,
        details=f"Acceso autorizado para {user.full_name}",
        user=user,
        request=request,
    )

    return LoginResponse(
        access_token=token,
        inactivity_timeout_minutes=settings.INACTIVITY_TIMEOUT_MINUTES,
        user=serialize_user_profile(user),
    )


@router.get("/me", response_model=UserProfile)
def me(current_user: User = Depends(get_current_user)):
    """Retorna el perfil del profesional autenticado y su matriz de permisos RBAC."""
    return serialize_user_profile(current_user)


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Registra el cierre de sesión en auditoría inmutable."""
    log_audit(
        db,
        action="LOGOUT",
        table_name="users",
        record_id=current_user.id,
        details="Cierre de sesión explícito o por inactividad",
        user=current_user,
        request=request,
    )
    return {"status": "ok", "message": "Sesión cerrada correctamente."}
