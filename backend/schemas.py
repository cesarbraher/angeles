"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# =============================================================================
# AUTENTICACIÓN Y USUARIOS
# =============================================================================
class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=2, description="Correo electrónico o nombre de usuario")
    password: str = Field(..., min_length=4)


class UserProfile(BaseModel):
    id: int
    institution_id: int
    institution_name: str
    username: str
    email: str
    full_name: str
    role_code: str
    role_name: str
    professional_license: str | None = None
    specialty: str | None = None
    is_active: bool = True
    permissions: dict[str, str]
    last_login_at: datetime | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    inactivity_timeout_minutes: int
    user: UserProfile


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=80)
    email: str = Field(..., min_length=5, max_length=160)
    full_name: str = Field(..., min_length=3, max_length=180)
    role_code: str = Field(..., description="ADMIN | ADMISSION | DOCTOR | PSYCHOLOGIST | COUNSELOR | SOCIAL_WORKER")
    professional_license: str | None = None
    specialty: str | None = None
    password: str = Field(..., min_length=8)


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    role_code: str | None = None
    professional_license: str | None = None
    specialty: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8)


# =============================================================================
# PACIENTES Y EXPEDIENTES
# =============================================================================
class PatientCreate(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=120)
    curp: str | None = Field(default=None, max_length=18)
    birth_date: date | None = None
    gender: str | None = None
    marital_status: str | None = None
    education_level: str | None = None
    occupation: str | None = None
    phone: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_rel: str | None = None
    emergency_contact_phone: str | None = None
    planned_discharge_date: date | None = None
    alert_flag: bool = False
    alert_summary: str | None = None


class PatientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    curp: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    marital_status: str | None = None
    education_level: str | None = None
    occupation: str | None = None
    phone: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_rel: str | None = None
    emergency_contact_phone: str | None = None
    status: str | None = None
    planned_discharge_date: date | None = None
    alert_flag: bool | None = None
    alert_summary: str | None = None


class PatientSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    institution_id: int
    folio: str
    first_name: str
    last_name: str
    curp: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    phone: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    status: str
    admission_date: datetime
    planned_discharge_date: date | None = None
    alert_flag: bool = False
    alert_summary: str | None = None


# =============================================================================
# MÓDULO 1: ADMISIÓN, CONSENTIMIENTO E INVENTARIO
# =============================================================================
class BelongingItem(BaseModel):
    item: str
    quantity: int = 1
    condition: str = "Bueno"
    notes: str | None = None


class AdmissionUpdate(BaseModel):
    admission_type: str = "VOLUNTARIO"
    referral_source: str | None = None
    admission_reason: str | None = None
    guardian_name: str | None = None
    guardian_id_number: str | None = None
    guardian_relationship: str | None = None
    consent_accepted: bool = False
    consent_signer_name: str | None = None
    consent_signer_role: str | None = "PACIENTE"
    consent_signature_data: str | None = None
    belongings_inventory_json: list[dict[str, Any]] | None = None
    belongings_notes: str | None = None


# =============================================================================
# MÓDULO 2: ÁREA MÉDICA Y SIGNOS VITALES
# =============================================================================
class MedicalRecordUpdate(BaseModel):
    blood_type: str | None = None
    allergies: str | None = None
    pathological_history: str | None = None
    substance_use_history: str | None = None
    primary_substance: str | None = None
    years_of_use: int | None = None
    physical_exam_summary: str | None = None
    detox_protocol: str | None = None
    prescriptions_json: list[dict[str, Any]] | None = None
    medical_alerts: str | None = None


class VitalSignCreate(BaseModel):
    bp_systolic: int | None = Field(default=None, ge=40, le=300)
    bp_diastolic: int | None = Field(default=None, ge=20, le=200)
    heart_rate: int | None = Field(default=None, ge=25, le=240)
    respiratory_rate: int | None = Field(default=None, ge=6, le=60)
    temperature_c: float | None = Field(default=None, ge=32.0, le=43.0)
    spo2_percent: int | None = Field(default=None, ge=50, le=100)
    glucose_mg_dl: int | None = Field(default=None, ge=20, le=800)
    observations: str | None = None


# =============================================================================
# MÓDULO 3: PSICOLOGÍA Y PSIQUIATRÍA
# =============================================================================
class PsychologicalRecordUpdate(BaseModel):
    anamnesis: str | None = None
    life_history: str | None = None
    mental_status_exam: str | None = None
    psychometric_tests_json: list[dict[str, Any]] | None = None
    cie11_code: str | None = None
    dsm5_code: str | None = None
    diagnosis_description: str | None = None
    risk_level: str = "BAJO"
    treatment_plan: str | None = None
    therapeutic_goals_json: list[dict[str, Any]] | None = None


# =============================================================================
# MÓDULO 4: CONSEJERÍA Y MENTORÍA (12 PASOS)
# =============================================================================
class CounselingRecordUpdate(BaseModel):
    current_step: int = Field(default=1, ge=1, le=12)
    steps_progress_json: list[dict[str, Any]] | None = None
    mentor_name: str | None = None
    counselor_notes: str | None = None
    sessions_log_json: list[dict[str, Any]] | None = None


class CounselingSessionCreate(BaseModel):
    session_date: str
    session_type: str = Field(..., description="INDIVIDUAL | GRUPAL | MENTORIA_VIVENCIAL")
    step_focus: int | None = Field(default=None, ge=1, le=12)
    summary: str = Field(..., min_length=3)
    agreements: str | None = None


# =============================================================================
# MÓDULO 5: NOTAS DE EVOLUCIÓN SOAP & ASISTENTE IA GEMINI
# =============================================================================
class SoapNoteCreate(BaseModel):
    patient_id: int
    note_category: str = "EVOLUCION_CLINICA"
    subjective: str = Field(..., min_length=3)
    objective: str = Field(..., min_length=3)
    assessment: str = Field(..., min_length=3)
    plan: str = Field(..., min_length=3)
    raw_dictation: str | None = None
    ai_assisted: bool = False


class SoapAddendumCreate(BaseModel):
    subjective: str = Field(..., min_length=3)
    objective: str = Field(..., min_length=3)
    assessment: str = Field(..., min_length=3)
    plan: str = Field(..., min_length=3)


class AiSoapAssistRequest(BaseModel):
    patient_id: str | int | None = None
    raw_clinician_dictation: str = Field(..., min_length=10, description="Texto libre o dictado clínico")


class SuggestedSoapPayload(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str


class AiSoapAssistResponse(BaseModel):
    status: str = "success"
    ai_provider: str
    requires_clinician_review: bool = True
    safety_notice: str
    suggested_soap: SuggestedSoapPayload


# =============================================================================
# MÓDULO 6: EGRESO / ALTA
# =============================================================================
class DischargeUpdate(BaseModel):
    discharge_type: str = "MEDICAL_THERAPEUTIC"
    discharge_date: datetime | None = None
    clinical_summary: str | None = None
    belongings_returned: bool = False
    belongings_return_notes: str | None = None
    relapse_prevention_plan: str | None = None
    triggers_identified: str | None = None
    support_commitments: str | None = None
    finalize_discharge: bool = False


# =============================================================================
# MÓDULOS DE EXPANSIÓN
# =============================================================================
class SocialWorkUpdate(BaseModel):
    socioeconomic_level: str | None = None
    housing_conditions: str | None = None
    family_structure: str | None = None
    support_network_score: int | None = Field(default=None, ge=1, le=10)
    family_visits_json: list[dict[str, Any]] | None = None
    observations: str | None = None


class LabScreeningCreate(BaseModel):
    test_type: str = Field(..., min_length=3)
    result_summary: str = Field(..., min_length=2)
    substances_json: dict[str, Any] | None = None
    notes: str | None = None


class FollowupCreate(BaseModel):
    milestone_months: int = Field(..., description="1, 3, 6 o 12 meses")
    scheduled_date: date
    contact_channel: str = "LLAMADA"
    status: str = "PROGRAMADO"
    abstinence_status: str | None = None
    notes: str | None = None


class FollowupUpdate(BaseModel):
    status: str | None = None
    contact_channel: str | None = None
    scheduled_date: date | None = None
    abstinence_status: str | None = None
    notes: str | None = None
