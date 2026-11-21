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
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from backend.audit import log_audit
from backend.database import get_db
from backend.models import Admission, CounselingRecord, MedicalRecord, Patient, PsychologicalRecord, User
from backend.rbac import get_role_permissions, has_permission, require_permission
from backend.schemas import PatientCreate, PatientSummary, PatientUpdate
from backend.seed import _default_twelve_steps
from backend.security import get_current_user

router = APIRouter(prefix="/api/v1/patients", tags=["Expedientes Clínicos (Pacientes)"])


def _generate_next_folio(db: Session, institution_id: int) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"ANG-{year}-"
    existing = (
        db.query(Patient.folio)
        .filter(Patient.institution_id == institution_id, Patient.folio.like(f"{prefix}%"))
        .all()
    )
    max_num = 0
    for (folio,) in existing:
        try:
            num = int(folio.replace(prefix, ""))
            if num > max_num:
                max_num = num
        except ValueError:
            continue
    return f"{prefix}{max_num + 1:03d}"


@router.get("", response_model=list[PatientSummary])
def list_patients(
    q: str | None = Query(default=None, description="Filtrar por nombre, folio o CURP"),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(require_permission("admission", "read")),
    db: Session = Depends(get_db),
):
    """Lista los expedientes de la institución con filtros rápidos."""
    query = db.query(Patient).filter(Patient.institution_id == current_user.institution_id)
    if status_filter and status_filter in {"ADMITTED", "DISCHARGED", "TRANSFERRED"}:
        query = query.filter(Patient.status == status_filter)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Patient.folio.ilike(like),
                Patient.first_name.ilike(like),
                Patient.last_name.ilike(like),
                Patient.curp.ilike(like),
            )
        )
    return query.order_by(Patient.admission_date.desc()).all()


@router.post("", response_model=PatientSummary, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    request: Request,
    current_user: User = Depends(require_permission("admission", "write")),
    db: Session = Depends(get_db),
):
    """Registra un nuevo paciente con folio automático ANG-YYYY-XXX y módulos base."""
    folio = _generate_next_folio(db, current_user.institution_id)
    patient = Patient(
        institution_id=current_user.institution_id,
        folio=folio,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        curp=payload.curp.strip().upper() if payload.curp else None,
        birth_date=payload.birth_date,
        gender=payload.gender,
        marital_status=payload.marital_status,
        education_level=payload.education_level,
        occupation=payload.occupation,
        phone=payload.phone,
        address=payload.address,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_rel=payload.emergency_contact_rel,
        emergency_contact_phone=payload.emergency_contact_phone,
        planned_discharge_date=payload.planned_discharge_date,
        alert_flag=payload.alert_flag,
        alert_summary=payload.alert_summary,
        status="ADMITTED",
        created_by_user_id=current_user.id,
    )
    db.add(patient)
    db.flush()

    # Inicializar contenedores vacíos para flujo inmediato en los módulos
    db.add(Admission(institution_id=current_user.institution_id, patient_id=patient.id, belongings_inventory_json=[], updated_by_user_id=current_user.id))
    db.add(MedicalRecord(institution_id=current_user.institution_id, patient_id=patient.id, prescriptions_json=[]))
    db.add(PsychologicalRecord(institution_id=current_user.institution_id, patient_id=patient.id, psychometric_tests_json=[], therapeutic_goals_json=[]))
    db.add(CounselingRecord(institution_id=current_user.institution_id, patient_id=patient.id, current_step=1, steps_progress_json=_default_twelve_steps(1), sessions_log_json=[]))
    db.commit()
    db.refresh(patient)

    log_audit(
        db,
        action="CREATE_PATIENT",
        table_name="patients",
        record_id=patient.folio,
        details=f"Nuevo expediente {patient.folio} — {patient.first_name} {patient.last_name}",
        user=current_user,
        request=request,
    )
    return patient


@router.put("/{patient_id}", response_model=PatientSummary)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    request: Request,
    current_user: User = Depends(require_permission("admission", "write")),
    db: Session = Depends(get_db),
):
    """Actualiza ficha demográfica del paciente."""
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.institution_id == current_user.institution_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Expediente clínico no encontrado.")

    data = payload.model_dump(exclude_unset=True)
    if "curp" in data and data["curp"]:
        data["curp"] = data["curp"].strip().upper()
    for key, val in data.items():
        setattr(patient, key, val)

    db.commit()
    db.refresh(patient)

    log_audit(
        db,
        action="UPDATE_PATIENT",
        table_name="patients",
        record_id=patient.folio,
        details=f"Actualización de ficha demográfica {patient.folio}",
        user=current_user,
        request=request,
    )
    return patient


def _model_to_dict(obj) -> dict | None:
    if obj is None:
        return None
    out = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if hasattr(val, "isoformat"):
            val = val.isoformat()
        out[col.name] = val
    return out


@router.get("/{patient_id}/full-chart")
def get_full_chart(
    patient_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve el expediente integral de 6 módulos + expansión filtrado estrictamente por RBAC."""
    patient = (
        db.query(Patient)
        .options(
            joinedload(Patient.admission),
            joinedload(Patient.medical_record),
            joinedload(Patient.vital_signs),
            joinedload(Patient.psychological_record),
            joinedload(Patient.counseling_record),
            joinedload(Patient.soap_notes),
            joinedload(Patient.discharge),
            joinedload(Patient.social_work_record),
            joinedload(Patient.lab_screenings),
            joinedload(Patient.followups),
        )
        .filter(Patient.id == patient_id, Patient.institution_id == current_user.institution_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Expediente clínico no encontrado.")

    role_code = current_user.role.code if current_user.role else "UNKNOWN"
    perms = get_role_permissions(role_code)

    log_audit(
        db,
        action="VIEW_FULL_CHART",
        table_name="patients",
        record_id=patient.folio,
        details=f"Consulta de expediente integral {patient.folio} (rol {role_code})",
        user=current_user,
        request=request,
    )

    return {
        "patient": _model_to_dict(patient),
        "permissions": perms,
        "modules": {
            "admission": {
                "access": perms["admission"],
                "data": _model_to_dict(patient.admission) if has_permission(role_code, "admission", "read") else None,
            },
            "medical": {
                "access": perms["medical"],
                "data": _model_to_dict(patient.medical_record) if has_permission(role_code, "medical", "read") else None,
                "vital_signs": [_model_to_dict(v) for v in patient.vital_signs] if has_permission(role_code, "medical", "read") else [],
            },
            "psychology": {
                "access": perms["psychology"],
                "data": _model_to_dict(patient.psychological_record) if has_permission(role_code, "psychology", "read") else None,
            },
            "counseling": {
                "access": perms["counseling"],
                "data": _model_to_dict(patient.counseling_record) if has_permission(role_code, "counseling", "read") else None,
            },
            "soap": {
                "access": perms["soap"],
                "notes": [_model_to_dict(n) for n in patient.soap_notes] if has_permission(role_code, "soap", "read") else [],
            },
            "discharge": {
                "access": perms["discharge"],
                "data": _model_to_dict(patient.discharge) if has_permission(role_code, "discharge", "read") else None,
            },
            "expansion": {
                "access": perms["expansion"],
                "social_work": _model_to_dict(patient.social_work_record) if has_permission(role_code, "expansion", "read") else None,
                "lab_screenings": [_model_to_dict(l) for l in patient.lab_screenings] if has_permission(role_code, "expansion", "read") else [],
                "followups": [_model_to_dict(f) for f in patient.followups] if has_permission(role_code, "expansion", "read") else [],
            },
        },
    }
