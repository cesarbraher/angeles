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
from sqlalchemy.orm import Session, joinedload

from backend.audit import log_audit
from backend.database import get_db
from backend.models import LabScreening, Patient, PostDischargeFollowup, SocialWorkRecord, User
from backend.rbac import require_permission
from backend.schemas import FollowupCreate, FollowupUpdate, LabScreeningCreate, SocialWorkUpdate

router = APIRouter(prefix="/api/v1", tags=["Módulos de Expansión (Trabajo Social, Lab, Seguimiento)"])


@router.get("/expansion/overview")
def expansion_overview(
    current_user: User = Depends(require_permission("expansion", "read")),
    db: Session = Depends(get_db),
):
    """Vista consolidada de Trabajo Social, Laboratorio Toxicológico y Seguimiento Post-Egreso."""
    inst_id = current_user.institution_id

    social_records = (
        db.query(SocialWorkRecord)
        .options(joinedload(SocialWorkRecord.patient))
        .filter(SocialWorkRecord.institution_id == inst_id)
        .order_by(SocialWorkRecord.updated_at.desc())
        .all()
    )
    labs = (
        db.query(LabScreening)
        .options(joinedload(LabScreening.patient))
        .filter(LabScreening.institution_id == inst_id)
        .order_by(LabScreening.performed_at.desc())
        .limit(30)
        .all()
    )
    followups = (
        db.query(PostDischargeFollowup)
        .options(joinedload(PostDischargeFollowup.patient))
        .filter(PostDischargeFollowup.institution_id == inst_id)
        .order_by(PostDischargeFollowup.scheduled_date.asc())
        .all()
    )

    return {
        "social_work": [
            {
                "id": r.id,
                "patient_id": r.patient_id,
                "patient_folio": r.patient.folio if r.patient else "",
                "patient_name": f"{r.patient.first_name} {r.patient.last_name}" if r.patient else "",
                "socioeconomic_level": r.socioeconomic_level,
                "support_network_score": r.support_network_score,
                "family_structure": r.family_structure,
                "observations": r.observations,
                "family_visits_json": r.family_visits_json or [],
            }
            for r in social_records
        ],
        "lab_screenings": [
            {
                "id": l.id,
                "patient_id": l.patient_id,
                "patient_folio": l.patient.folio if l.patient else "",
                "patient_name": f"{l.patient.first_name} {l.patient.last_name}" if l.patient else "",
                "test_type": l.test_type,
                "performed_at": l.performed_at.isoformat(),
                "result_summary": l.result_summary,
                "substances_json": l.substances_json or {},
                "notes": l.notes,
            }
            for l in labs
        ],
        "followups": [
            {
                "id": f.id,
                "patient_id": f.patient_id,
                "patient_folio": f.patient.folio if f.patient else "",
                "patient_name": f"{f.patient.first_name} {f.patient.last_name}" if f.patient else "",
                "milestone_months": f.milestone_months,
                "scheduled_date": f.scheduled_date.isoformat(),
                "contact_channel": f.contact_channel,
                "status": f.status,
                "abstinence_status": f.abstinence_status,
                "notes": f.notes,
            }
            for f in followups
        ],
    }


@router.put("/patients/{patient_id}/social-work")
def upsert_social_work(
    patient_id: int,
    payload: SocialWorkUpdate,
    request: Request,
    current_user: User = Depends(require_permission("expansion", "write")),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.institution_id == current_user.institution_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    record = db.query(SocialWorkRecord).filter(SocialWorkRecord.patient_id == patient.id).first()
    if not record:
        record = SocialWorkRecord(institution_id=current_user.institution_id, patient_id=patient.id)
        db.add(record)

    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, val)
    record.updated_by_user_id = current_user.id
    db.commit()

    log_audit(
        db,
        action="UPDATE_SOCIAL_WORK",
        table_name="social_work_records",
        record_id=patient.folio,
        details=f"Actualización de Trabajo Social / Entorno Familiar — {patient.folio}",
        user=current_user,
        request=request,
    )
    return {"status": "saved", "patient_folio": patient.folio}


@router.post("/patients/{patient_id}/lab-screenings", status_code=status.HTTP_201_CREATED)
def create_lab_screening(
    patient_id: int,
    payload: LabScreeningCreate,
    request: Request,
    current_user: User = Depends(require_permission("expansion", "write")),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.institution_id == current_user.institution_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    lab = LabScreening(
        institution_id=current_user.institution_id,
        patient_id=patient.id,
        test_type=payload.test_type,
        result_summary=payload.result_summary,
        substances_json=payload.substances_json or {},
        notes=payload.notes,
        recorded_by_user_id=current_user.id,
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)

    log_audit(
        db,
        action="CREATE_LAB_SCREENING",
        table_name="lab_screenings",
        record_id=lab.id,
        details=f"Tamizaje {payload.test_type} ({payload.result_summary}) — {patient.folio}",
        user=current_user,
        request=request,
    )
    return {"status": "created", "id": lab.id}


@router.post("/patients/{patient_id}/followups", status_code=status.HTTP_201_CREATED)
def create_followup(
    patient_id: int,
    payload: FollowupCreate,
    request: Request,
    current_user: User = Depends(require_permission("expansion", "write")),
    db: Session = Depends(get_db),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.institution_id == current_user.institution_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    followup = PostDischargeFollowup(
        institution_id=current_user.institution_id,
        patient_id=patient.id,
        milestone_months=payload.milestone_months,
        scheduled_date=payload.scheduled_date,
        contact_channel=payload.contact_channel,
        status=payload.status,
        abstinence_status=payload.abstinence_status,
        notes=payload.notes,
        assigned_user_id=current_user.id,
    )
    db.add(followup)
    db.commit()
    db.refresh(followup)

    log_audit(
        db,
        action="CREATE_FOLLOWUP",
        table_name="post_discharge_followups",
        record_id=followup.id,
        details=f"Seguimiento post-alta {payload.milestone_months}m programado para {patient.folio}",
        user=current_user,
        request=request,
    )
    return {"status": "created", "id": followup.id}


@router.patch("/followups/{followup_id}")
def update_followup(
    followup_id: int,
    payload: FollowupUpdate,
    request: Request,
    current_user: User = Depends(require_permission("expansion", "write")),
    db: Session = Depends(get_db),
):
    followup = (
        db.query(PostDischargeFollowup)
        .filter(
            PostDischargeFollowup.id == followup_id,
            PostDischargeFollowup.institution_id == current_user.institution_id,
        )
        .first()
    )
    if not followup:
        raise HTTPException(status_code=404, detail="Cita de seguimiento no encontrada.")

    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(followup, key, val)
    if payload.status == "COMPLETADO":
        followup.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    log_audit(
        db,
        action="UPDATE_FOLLOWUP",
        table_name="post_discharge_followups",
        record_id=followup.id,
        details=f"Actualización seguimiento #{followup.id} -> estado={followup.status}",
        user=current_user,
        request=request,
    )
    return {"status": "updated", "id": followup.id}
