"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

from datetime import datetime, date, timezone
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(40), unique=True, nullable=False)
    name = Column(String(180), nullable=False)
    legal_name = Column(String(220), nullable=False)
    city = Column(String(100), nullable=False, default="Irapuato")
    state = Column(String(100), nullable=False, default="Guanajuato")
    country = Column(String(100), nullable=False, default="México")
    website = Column(String(180), nullable=True)
    domain = Column(String(180), nullable=True)
    phone = Column(String(40), nullable=True)
    email = Column(String(150), nullable=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("institution_id", "code", name="uq_roles_inst_code"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    code = Column(String(40), nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    permissions_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(160), unique=True, nullable=False)
    full_name = Column(String(180), nullable=False)
    professional_license = Column(String(80), nullable=True)
    specialty = Column(String(120), nullable=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    role = relationship("Role", back_populates="users")
    institution = relationship("Institution")


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (UniqueConstraint("institution_id", "folio", name="uq_patients_inst_folio"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    folio = Column(String(32), nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(120), nullable=False)
    curp = Column(String(18), nullable=True, index=True)
    birth_date = Column(Date, nullable=True)
    gender = Column(String(32), nullable=True)
    marital_status = Column(String(40), nullable=True)
    education_level = Column(String(80), nullable=True)
    occupation = Column(String(100), nullable=True)
    phone = Column(String(40), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String(160), nullable=True)
    emergency_contact_rel = Column(String(80), nullable=True)
    emergency_contact_phone = Column(String(40), nullable=True)
    status = Column(String(24), nullable=False, default="ADMITTED")
    admission_date = Column(DateTime, nullable=False, default=utcnow)
    planned_discharge_date = Column(Date, nullable=True)
    alert_flag = Column(Boolean, nullable=False, default=False)
    alert_summary = Column(String(255), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    admission = relationship("Admission", back_populates="patient", uselist=False)
    medical_record = relationship("MedicalRecord", back_populates="patient", uselist=False)
    vital_signs = relationship("VitalSign", back_populates="patient", order_by="desc(VitalSign.recorded_at)")
    psychological_record = relationship("PsychologicalRecord", back_populates="patient", uselist=False)
    counseling_record = relationship("CounselingRecord", back_populates="patient", uselist=False)
    soap_notes = relationship("SoapNote", back_populates="patient", order_by="desc(SoapNote.created_at)")
    discharge = relationship("Discharge", back_populates="patient", uselist=False)
    social_work_record = relationship("SocialWorkRecord", back_populates="patient", uselist=False)
    lab_screenings = relationship("LabScreening", back_populates="patient", order_by="desc(LabScreening.performed_at)")
    followups = relationship("PostDischargeFollowup", back_populates="patient", order_by="PostDischargeFollowup.scheduled_date")


class Admission(Base):
    __tablename__ = "admissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    admission_type = Column(String(60), nullable=False, default="VOLUNTARIO")
    referral_source = Column(String(160), nullable=True)
    admission_reason = Column(Text, nullable=True)
    guardian_name = Column(String(160), nullable=True)
    guardian_id_number = Column(String(80), nullable=True)
    guardian_relationship = Column(String(80), nullable=True)
    consent_accepted = Column(Boolean, nullable=False, default=False)
    consent_version = Column(String(32), nullable=False, default="v1.0-2026")
    consent_signer_name = Column(String(160), nullable=True)
    consent_signer_role = Column(String(60), nullable=True)
    consent_signature_data = Column(Text, nullable=True)
    consent_signature_hash = Column(String(64), nullable=True)
    consent_signed_at = Column(DateTime, nullable=True)
    belongings_inventory_json = Column(JSON, nullable=True)
    belongings_notes = Column(Text, nullable=True)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="admission")


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    blood_type = Column(String(10), nullable=True)
    allergies = Column(Text, nullable=True)
    pathological_history = Column(Text, nullable=True)
    substance_use_history = Column(Text, nullable=True)
    primary_substance = Column(String(120), nullable=True)
    years_of_use = Column(Integer, nullable=True)
    physical_exam_summary = Column(Text, nullable=True)
    detox_protocol = Column(Text, nullable=True)
    prescriptions_json = Column(JSON, nullable=True)
    medical_alerts = Column(Text, nullable=True)
    attending_physician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="medical_record")


class VitalSign(Base):
    __tablename__ = "vital_signs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    bp_systolic = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    respiratory_rate = Column(Integer, nullable=True)
    temperature_c = Column(Float, nullable=True)
    spo2_percent = Column(Integer, nullable=True)
    glucose_mg_dl = Column(Integer, nullable=True)
    observations = Column(String(255), nullable=True)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recorded_at = Column(DateTime, nullable=False, default=utcnow)

    patient = relationship("Patient", back_populates="vital_signs")


class PsychologicalRecord(Base):
    __tablename__ = "psychological_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    anamnesis = Column(Text, nullable=True)
    life_history = Column(Text, nullable=True)
    mental_status_exam = Column(Text, nullable=True)
    psychometric_tests_json = Column(JSON, nullable=True)
    cie11_code = Column(String(40), nullable=True)
    dsm5_code = Column(String(60), nullable=True)
    diagnosis_description = Column(Text, nullable=True)
    risk_level = Column(String(20), nullable=False, default="BAJO")
    treatment_plan = Column(Text, nullable=True)
    therapeutic_goals_json = Column(JSON, nullable=True)
    specialist_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="psychological_record")


class CounselingRecord(Base):
    __tablename__ = "counseling_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    current_step = Column(Integer, nullable=False, default=1)
    steps_progress_json = Column(JSON, nullable=True)
    mentor_name = Column(String(160), nullable=True)
    counselor_notes = Column(Text, nullable=True)
    sessions_log_json = Column(JSON, nullable=True)
    counselor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="counseling_record")


class SoapNote(Base):
    __tablename__ = "soap_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    note_category = Column(String(60), nullable=False, default="EVOLUCION_CLINICA")
    subjective = Column(Text, nullable=False)
    objective = Column(Text, nullable=False)
    assessment = Column(Text, nullable=False)
    plan = Column(Text, nullable=False)
    raw_dictation = Column(Text, nullable=True)
    ai_assisted = Column(Boolean, nullable=False, default=False)
    is_addendum = Column(Boolean, nullable=False, default=False)
    parent_note_id = Column(Integer, ForeignKey("soap_notes.id"), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String(180), nullable=False)
    author_role = Column(String(60), nullable=False)
    professional_license = Column(String(80), nullable=True)
    digital_signature_hash = Column(String(64), nullable=False)
    signed_at = Column(DateTime, nullable=False, default=utcnow)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    patient = relationship("Patient", back_populates="soap_notes")


class Discharge(Base):
    __tablename__ = "discharges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    discharge_type = Column(String(32), nullable=False, default="MEDICAL_THERAPEUTIC")
    discharge_date = Column(DateTime, nullable=True)
    clinical_summary = Column(Text, nullable=True)
    belongings_returned = Column(Boolean, nullable=False, default=False)
    belongings_return_notes = Column(Text, nullable=True)
    relapse_prevention_plan = Column(Text, nullable=True)
    triggers_identified = Column(Text, nullable=True)
    support_commitments = Column(Text, nullable=True)
    authorized_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    digital_signature_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="discharge")


class SocialWorkRecord(Base):
    __tablename__ = "social_work_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    socioeconomic_level = Column(String(60), nullable=True)
    housing_conditions = Column(Text, nullable=True)
    family_structure = Column(Text, nullable=True)
    support_network_score = Column(Integer, nullable=True)
    family_visits_json = Column(JSON, nullable=True)
    observations = Column(Text, nullable=True)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="social_work_record")


class LabScreening(Base):
    __tablename__ = "lab_screenings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    test_type = Column(String(120), nullable=False)
    performed_at = Column(DateTime, nullable=False, default=utcnow)
    result_summary = Column(String(160), nullable=False)
    substances_json = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    patient = relationship("Patient", back_populates="lab_screenings")


class PostDischargeFollowup(Base):
    __tablename__ = "post_discharge_followups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    milestone_months = Column(Integer, nullable=False)
    scheduled_date = Column(Date, nullable=False, default=date.today)
    contact_channel = Column(String(40), nullable=False, default="LLAMADA")
    status = Column(String(24), nullable=False, default="PROGRAMADO")
    abstinence_status = Column(String(80), nullable=True)
    notes = Column(Text, nullable=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="followups")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, default=1)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(String(60), nullable=False)
    action = Column(String(80), nullable=False)
    table_name = Column(String(80), nullable=False)
    record_id = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
