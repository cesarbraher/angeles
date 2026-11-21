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
from backend.models import Role, User
from backend.rbac import REGISTERABLE_ROLES, get_role_permissions
from backend.schemas import LoginRequest, LoginResponse, ProfessionalRegisterRequest, UserProfile
from backend.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación y Registro Profesional"])


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
        approval_status=user.approval_status or "APPROVED",
        is_active=user.is_active,
        permissions=get_role_permissions(role_code),
        last_login_at=user.last_login_at,
    )


@router.post("/register-professional", status_code=status.HTTP_201_CREATED)
def register_professional(
    payload: ProfessionalRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Registro público de profesionales clínicos (queda PENDIENTE hasta autorización del Master)."""
    role_code = payload.role_code.strip().upper()
    if role_code not in REGISTERABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perfil profesional no permitido. Seleccione Consejero, Psicólogo, Médico, Psiquiatra o Nutriólogo.",
        )

    role = db.query(Role).filter(Role.institution_id == 1, Role.code == role_code).first()
    if not role:
        raise HTTPException(status_code=400, detail="Rol profesional no configurado en la institución.")

    uname = payload.username.strip().lower()
    email = payload.email.strip().lower()
    exists = db.query(User).filter(or_(User.username.ilike(uname), User.email.ilike(email))).first()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El nombre de usuario o correo electrónico ya se encuentra registrado.",
        )

    docs_serialized = [d.model_dump() for d in payload.documents]

    new_prof = User(
        institution_id=1,
        role_id=role.id,
        username=uname,
        email=email,
        full_name=payload.full_name.strip(),
        professional_license=payload.professional_license.strip(),
        specialty=payload.specialty.strip() if payload.specialty else role.display_name,
        curp=payload.curp.strip().upper() if payload.curp else None,
        rfc=payload.rfc.strip().upper() if payload.rfc else None,
        birth_date=payload.birth_date,
        phone=payload.phone.strip(),
        address=payload.address.strip() if payload.address else None,
        university=payload.university.strip() if payload.university else None,
        graduation_year=payload.graduation_year,
        experience_years=payload.experience_years,
        bio=payload.bio.strip() if payload.bio else None,
        documents_json=docs_serialized,
        default_signature_data=payload.default_signature_data,
        approval_status="PENDING",
        is_active=False,
        password_hash=hash_password(payload.password),
    )
    db.add(new_prof)
    db.commit()
    db.refresh(new_prof)

    log_audit(
        db,
        action="PROFESSIONAL_REGISTER_SUBMITTED",
        table_name="users",
        record_id=new_prof.id,
        details=f"Solicitud de registro profesional: {new_prof.full_name} ({role.display_name}) — {len(docs_serialized)} documento(s)",
        role_override="APPLICANT",
        request=request,
    )

    return {
        "status": "pending_approval",
        "id": new_prof.id,
        "username": new_prof.username,
        "role_name": role.display_name,
        "documents_count": len(docs_serialized),
        "message": (
            "Tu solicitud de registro y documentación fueron enviadas correctamente. "
            "La cuenta quedará activa en cuanto la administración de ÁNGELES DE ESPERANZA revise y autorice tu registro."
        ),
    }


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Autentica al Master o a profesionales autorizados, emite JWT y registra auditoría."""
    identifier = payload.identifier.strip().lower()
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.institution))
        .filter(or_(User.email.ilike(identifier), User.username.ilike(identifier)))
        .first()
    )

    if not user or not verify_password(payload.password, user.password_hash):
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
            detail="Usuario o contraseña incorrectos.",
        )

    if user.approval_status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Tu registro profesional está pendiente de revisión y autorización por parte "
                "de la administración (ÁNGELES DE ESPERANZA). Podrás acceder en cuanto sea autorizado."
            ),
        )

    if user.approval_status == "REJECTED":
        reason = f" Motivo: {user.rejection_reason}" if user.rejection_reason else ""
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tu solicitud de registro no fue autorizada.{reason}",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta se encuentra desactivada. Contacta al administrador.",
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
