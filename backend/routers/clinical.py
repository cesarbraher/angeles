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
from sqlalchemy.orm import Session

from backend.ai_service import structure_soap_with_gemini
from backend.audit import log_audit
from backend.database import get_db
from backend.models import (
    Admission,
    CounselingRecord,
    Discharge,
    MedicalRecord,
    Patient,
    PsychologicalRecord,
    SoapNote,
    User,
    VitalSign,
)
from backend.rbac import require_permission
from backend.schemas import (
    AdmissionUpdate,
    AiSoapAssistRequest,
    AiSoapAssistResponse,
    CounselingRecordUpdate,
    CounselingSessionCreate,
    DischargeUpdate,
    MedicalRecordUpdate,
    PsychologicalRecordUpdate,
    SoapAddendumCreate,
    SoapNoteCreate,
    VitalSignCreate,
)
from backend.seed import _default_twelve_steps
from backend.security import build_digital_signature_hash

router = APIRouter(prefix="/api/v1", tags=["Módulos Clínicos (1-6), SOAP e IA Gemini"])


def _get_patient_or_404(db: Session, patient_id: int, institution_id: int) -> Patient:
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.institution_id == institution_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Expediente clínico no encontrado.")
    return patient


# =============================================================================
# MÓDULO 1: ADMISIÓN, CONSENTIMIENTO CAPACITIVO E INVENTARIO
# =============================================================================
@router.put("/patients/{patient_id}/admission")
def upsert_admission(
    patient_id: int,
    payload: AdmissionUpdate,
    request: Request,
    current_user: User = Depends(require_permission("admission", "write")),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id, current_user.institution_id)
    admission = db.query(Admission).filter(Admission.patient_id == patient.id).first()
    if not admission:
        admission = Admission(institution_id=current_user.institution_id, patient_id=patient.id)
        db.add(admission)

    admission.admission_type = payload.admission_type
    admission.referral_source = payload.referral_source
    admission.admission_reason = payload.admission_reason
    admission.guardian_name = payload.guardian_name
    admission.guardian_id_number = payload.guardian_id_number
    admission.guardian_relationship = payload.guardian_relationship
    admission.consent_accepted = payload.consent_accepted
    admission.consent_signer_name = payload.consent_signer_name
    admission.consent_signer_role = payload.consent_signer_role
    if payload.belongings_inventory_json is not None:
        admission.belongings_inventory_json = payload.belongings_inventory_json
    admission.belongings_notes = payload.belongings_notes
    admission.updated_by_user_id = current_user.id

    if payload.consent_signature_data:
        signed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        admission.consent_signature_data = payload.consent_signature_data
        admission.consent_signed_at = signed_at
        admission.consent_signature_hash = build_digital_signature_hash(
            {
                "folio": patient.folio,
                "signer_name": payload.consent_signer_name or "",
                "signer_role": payload.consent_signer_role or "PACIENTE",
                "version": admission.consent_version,
                "signature_prefix": payload.consent_signature_data[:120],
                "signed_at": signed_at.isoformat(),
                "recorded_by": current_user.id,
            }
        )

    db.commit()
    db.refresh(admission)

    log_audit(
        db,
        action="UPDATE_ADMISSION_CONSENT",
        table_name="admissions",
        record_id=patient.folio,
        details=f"Actualización Módulo 1 (Admisión/Consentimiento/Inventario) — {patient.folio}",
        user=current_user,
        request=request,
    )
    return {
        "status": "saved",
        "consent_signature_hash": admission.consent_signature_hash,
        "consent_signed_at": admission.consent_signed_at.isoformat() if admission.consent_signed_at else None,
    }


# =============================================================================
# MÓDULO 2: ÁREA MÉDICA Y SIGNOS VITALES CONTINUOS
# =============================================================================
@router.put("/patients/{patient_id}/medical")
def upsert_medical_record(
    patient_id: int,
    payload: MedicalRecordUpdate,
    request: Request,
    current_user: User = Depends(require_permission("medical", "write")),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id, current_user.institution_id)
    record = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient.id).first()
    if not record:
        record = MedicalRecord(institution_id=current_user.institution_id, patient_id=patient.id)
        db.add(record)

    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, val)
    record.attending_physician_id = current_user.id

    db.commit()

    log_audit(
        db,
        action="UPDATE_MEDICAL_RECORD",
        table_name="medical_records",
        record_id=patient.folio,
        details=f"Actualización historia médica/desintoxicación — {patient.folio}",
        user=current_user,
        request=request,
    )
    return {"status": "saved", "patient_folio": patient.folio}


@router.post("/patients/{patient_id}/vitals", status_code=status.HTTP_201_CREATED)
def add_vital_signs(
    patient_id: int,
    payload: VitalSignCreate,
    request: Request,
    current_user: User = Depends(require_permission("medical", "write")),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id, current_user.institution_id)
    vital = VitalSign(
        institution_id=current_user.institution_id,
        patient_id=patient.id,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
        heart_rate=payload.heart_rate,
        respiratory_rate=payload.respiratory_rate,
        temperature_c=payload.temperature_c,
        spo2_percent=payload.spo2_percent,
        glucose_mg_dl=payload.glucose_mg_dl,
        observations=payload.observations,
        recorded_by_user_id=current_user.id,
    )
    db.add(vital)
    db.commit()
    db.refresh(vital)

    log_audit(
        db,
        action="CREATE_VITAL_SIGNS",
        table_name="vital_signs",
        record_id=vital.id,
        details=f"Registro de signos vitales {patient.folio}: TA {payload.bp_systolic}/{payload.bp_diastolic}, FC {payload.heart_rate}",
        user=current_user,
        request=request,
    )
    return {"status": "created", "id": vital.id, "recorded_at": vital.recorded_at.isoformat()}


# =============================================================================
# MÓDULO 3: PSICOLOGÍA Y PSIQUIATRÍA (CIE-11 / DSM-5)
# =============================================================================
@router.put("/patients/{patient_id}/psychology")
def upsert_psychology_record(
    patient_id: int,
    payload: PsychologicalRecordUpdate,
    request: Request,
    current_user: User = Depends(require_permission("psychology", "write")),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id, current_user.institution_id)
    record = db.query(PsychologicalRecord).filter(PsychologicalRecord.patient_id == patient.id).first()
    if not record:
        record = PsychologicalRecord(institution_id=current_user.institution_id, patient_id=patient.id)
        db.add(record)

    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, val)
    record.specialist_user_id = current_user.id

    db.commit()

    log_audit(
        db,
        action="UPDATE_PSYCHOLOGY_RECORD",
        table_name="psychological_records",
        record_id=patient.folio,
        details=f"Actualización módulo psicológico CIE-11={record.cie11_code} — {patient.folio}",
        user=current_user,
        request=request,
    )
    return {"status": "saved", "patient_folio": patient.folio}


# =============================================================================
# MÓDULO 4: CONSEJERÍA Y MENTORÍA (PROGRAMA 12 PASOS)
# =============================================================================
@router.put("/patients/{patient_id}/counseling")
def upsert_counseling_record(
    patient_id: int,
    payload: CounselingRecordUpdate,
    request: Request,
    current_user: User = Depends(require_permission("counseling", "write")),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id, current_user.institution_id)
    record = db.query(CounselingRecord).filter(CounselingRecord.patient_id == patient.id).first()
    if not record:
        record = CounselingRecord(
            institution_id=current_user.institution_id,
            patient_id=patient.id,
            steps_progress_json=_default_twelve_steps(payload.current_step),
            sessions_log_json=[],
        )
        db.add(record)

    record.current_step = payload.current_step
    if payload.steps_progress_json is not None:
        record.steps_progress_json = payload.steps_progress_json
    if payload.mentor_name is not None:
        record.mentor_name = payload.mentor_name
    if payload.counselor_notes is not None:
        record.counselor_notes = payload.counselor_notes
    if payload.sessions_log_json is not None:
        record.sessions_log_json = payload.sessions_log_json
    record.counselor_user_id = current_user.id

    db.commit()

    log_audit(
        db,
        action="UPDATE_COUNSELING_12STEPS",
        table_name="counseling_records",
        record_id=patient.folio,
        details=f"Avance en Programa 12 Pasos (Paso {record.current_step}) — {patient.folio}",
        user=current_user,
        request=request,
    )
    return {"status": "saved", "current_step": record.current_step}


@router.post("/patients/{patient_id}/counseling/sessions", status_code=status.HTTP_201_CREATED)
def add_counseling_session(
    patient_id: int,
    payload: CounselingSessionCreate,
    request: Request,
    current_user: User = Depends(require_permission("counseling", "write")),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id, current_user.institution_id)
    record = db.query(CounselingRecord).filter(CounselingRecord.patient_id == patient.id).first()
    if not record:
        record = CounselingRecord(
            institution_id=current_user.institution_id,
            patient_id=patient.id,
            current_step=1,
            steps_progress_json=_default_twelve_steps(1),
            sessions_log_json=[],
        )
        db.add(record)

    sessions = list(record.sessions_log_json or [])
    new_entry = {
        "session_date": payload.session_date,
        "session_type": payload.session_type,
        "step_focus": payload.step_focus,
        "summary": payload.summary,
        "agreements": payload.agreements or "",
        "recorded_by": current_user.full_name,
    }
    sessions.insert(0, new_entry)
    record.sessions_log_json = sessions
    record.counselor_user_id = current_user.id
    db.commit()

    log_audit(
        db,
        action="CREATE_COUNSELING_SESSION",
        table_name="counseling_records",
        record_id=patient.folio,
        details=f"Sesión {payload.session_type} registrada en {patient.folio}",
        user=current_user,
        request=request,
    )
    return {"status": "created", "session": new_entry}


# =============================================================================
# MÓDULO 5: NOTAS DE EVOLUCIÓN SOAP (INMUTABLE + SHA-256 + ADENDAS) + GEMINI AI
# =============================================================================
@router.post("/ai/assist-soap", response_model=AiSoapAssistResponse)
def ai_assist_soap(
    payload: AiSoapAssistRequest,
    request: Request,
    current_user: User = Depends(require_permission("soap", "write")),
    db: Session = Depends(get_db),
):
    """Estructura texto libre o dictado clínico en un borrador SOAP editable vía Gemini AI."""
    result = structure_soap_with_gemini(payload.raw_clinician_dictation)
    log_audit(
        db,
        action="AI_SOAP_DRAFT_GENERATED",
        table_name="soap_notes",
        record_id=str(payload.patient_id or "draft"),
        details=f"Borrador SOAP generado con {result.ai_provider} (requiere confirmación profesional)",
        user=current_user,
        request=request,
    )
    return result


@router.post("/clinical/soap-notes", status_code=status.HTTP_201_CREATED)
def create_soap_note(
    payload: SoapNoteCreate,
    request: Request,
    current_user: User = Depends(require_permission("soap", "write")),
    db: Session = Depends(get_db),
):
    """Guarda y firma digitalmente (SHA-256) una Nota de Evolución SOAP inmutable."""
    patient = _get_patient_or_404(db, payload.patient_id, current_user.institution_id)
    signed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    role_code = current_user.role.code if current_user.role else "UNKNOWN"

    sig_hash = build_digital_signature_hash(
        {
            "institution_id": current_user.institution_id,
            "patient_id": patient.id,
            "folio": patient.folio,
            "author_id": current_user.id,
            "author_role": role_code,
            "professional_license": current_user.professional_license or "SIN-CEDULA",
            "subjective": payload.subjective.strip(),
            "objective": payload.objective.strip(),
            "assessment": payload.assessment.strip(),
            "plan": payload.plan.strip(),
            "signed_at": signed_at.isoformat(),
        }
    )

    note = SoapNote(
        institution_id=current_user.institution_id,
        patient_id=patient.id,
        note_category=payload.note_category,
        subjective=payload.subjective.strip(),
        objective=payload.objective.strip(),
        assessment=payload.assessment.strip(),
        plan=payload.plan.strip(),
        raw_dictation=payload.raw_dictation,
        ai_assisted=payload.ai_assisted,
        is_addendum=False,
        created_by_user_id=current_user.id,
        author_name=current_user.full_name,
        author_role=role_code,
        professional_license=current_user.professional_license,
        digital_signature_hash=sig_hash,
        signed_at=signed_at,
        created_at=signed_at,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_audit(
        db,
        action="SIGN_SOAP_NOTE",
        table_name="soap_notes",
        record_id=note.id,
        details=f"Nota SOAP firmada ({sig_hash[:12]}...) en expediente {patient.folio}",
        user=current_user,
        request=request,
    )

    return {
        "status": "signed",
        "id": note.id,
        "digital_signature_hash": note.digital_signature_hash,
        "signed_at": note.signed_at.isoformat(),
        "author_name": note.author_name,
        "professional_license": note.professional_license,
    }


@router.post("/clinical/soap-notes/{note_id}/addendum", status_code=status.HTTP_201_CREATED)
def create_soap_addendum(
    note_id: int,
    payload: SoapAddendumCreate,
    request: Request,
    current_user: User = Depends(require_permission("soap", "write")),
    db: Session = Depends(get_db),
):
    """Crea una Nota Aclaratoria / Adenda vinculada a una nota SOAP firmada (sin borrar el original)."""
    original = (
        db.query(SoapNote)
        .filter(SoapNote.id == note_id, SoapNote.institution_id == current_user.institution_id)
        .first()
    )
    if not original:
        raise HTTPException(status_code=404, detail="Nota SOAP original no encontrada.")

    signed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    role_code = current_user.role.code if current_user.role else "UNKNOWN"
    sig_hash = build_digital_signature_hash(
        {
            "parent_note_id": original.id,
            "patient_id": original.patient_id,
            "author_id": current_user.id,
            "professional_license": current_user.professional_license or "SIN-CEDULA",
            "subjective": payload.subjective.strip(),
            "objective": payload.objective.strip(),
            "assessment": payload.assessment.strip(),
            "plan": payload.plan.strip(),
            "signed_at": signed_at.isoformat(),
        }
    )

    addendum = SoapNote(
        institution_id=current_user.institution_id,
        patient_id=original.patient_id,
        note_category="NOTA_ACLARATORIA_ADENDA",
        subjective=payload.subjective.strip(),
        objective=payload.objective.strip(),
        assessment=payload.assessment.strip(),
        plan=payload.plan.strip(),
        ai_assisted=False,
        is_addendum=True,
        parent_note_id=original.id,
        created_by_user_id=current_user.id,
        author_name=current_user.full_name,
        author_role=role_code,
        professional_license=current_user.professional_license,
        digital_signature_hash=sig_hash,
        signed_at=signed_at,
        created_at=signed_at,
    )
    db.add(addendum)
    db.commit()
    db.refresh(addendum)

    log_audit(
        db,
        action="SIGN_SOAP_ADDENDUM",
        table_name="soap_notes",
        record_id=addendum.id,
        details=f"Adenda #{addendum.id} vinculada a nota SOAP #{original.id}",
        user=current_user,
        request=request,
    )

    return {
        "status": "signed_addendum",
        "id": addendum.id,
        "parent_note_id": original.id,
        "digital_signature_hash": addendum.digital_signature_hash,
        "signed_at": addendum.signed_at.isoformat(),
    }


@router.delete("/clinical/soap-notes/{note_id}")
def block_soap_deletion(
    note_id: int,
    request: Request,
    current_user: User = Depends(require_permission("soap", "read")),
    db: Session = Depends(get_db),
):
    """Bloqueo explícito de normativa: nadie (ni el Administrador) puede borrar notas clínicas firmadas."""
    log_audit(
        db,
        action="BLOCKED_SOAP_DELETE_ATTEMPT",
        table_name="soap_notes",
        record_id=note_id,
        details="Intento bloqueado por normativa de inmutabilidad clínica",
        user=current_user,
        request=request,
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            "Normativa clínica: Ningún usuario puede eliminar notas SOAP firmadas. "
            "Para corregir información utilice el endpoint de Nota Aclaratoria / Adenda."
        ),
    )


# =============================================================================
# MÓDULO 6: EGRESO / ALTA Y PLAN DE PREVENCIÓN DE RECAÍDAS
# =============================================================================
@router.put("/patients/{patient_id}/discharge")
def upsert_discharge(
    patient_id: int,
    payload: DischargeUpdate,
    request: Request,
    current_user: User = Depends(require_permission("discharge", "write")),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id, current_user.institution_id)
    discharge = db.query(Discharge).filter(Discharge.patient_id == patient.id).first()
    if not discharge:
        discharge = Discharge(institution_id=current_user.institution_id, patient_id=patient.id)
        db.add(discharge)

    discharge.discharge_type = payload.discharge_type
    discharge.discharge_date = payload.discharge_date or datetime.now(timezone.utc).replace(tzinfo=None)
    discharge.clinical_summary = payload.clinical_summary
    discharge.belongings_returned = payload.belongings_returned
    discharge.belongings_return_notes = payload.belongings_return_notes
    discharge.relapse_prevention_plan = payload.relapse_prevention_plan
    discharge.triggers_identified = payload.triggers_identified
    discharge.support_commitments = payload.support_commitments
    discharge.authorized_by_user_id = current_user.id
    discharge.digital_signature_hash = build_digital_signature_hash(
        {
            "folio": patient.folio,
            "discharge_type": payload.discharge_type,
            "summary": payload.clinical_summary or "",
            "author_id": current_user.id,
            "date": discharge.discharge_date.isoformat(),
        }
    )

    if payload.finalize_discharge:
        patient.status = "TRANSFERRED" if payload.discharge_type == "TRANSFER" else "DISCHARGED"

    db.commit()

    log_audit(
        db,
        action="UPDATE_DISCHARGE_RECORD",
        table_name="discharges",
        record_id=patient.folio,
        details=f"Dictamen de egreso ({payload.discharge_type}) finalizado={payload.finalize_discharge} — {patient.folio}",
        user=current_user,
        request=request,
    )
    return {
        "status": "saved",
        "patient_status": patient.status,
        "digital_signature_hash": discharge.digital_signature_hash,
    }
