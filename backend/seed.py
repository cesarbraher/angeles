"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from backend.models import (
    Admission,
    AuditLog,
    CounselingRecord,
    Discharge,
    Institution,
    LabScreening,
    MedicalRecord,
    Patient,
    PostDischargeFollowup,
    PsychologicalRecord,
    Role,
    SoapNote,
    SocialWorkRecord,
    User,
    VitalSign,
)
from backend.rbac import RBAC_MATRIX
from backend.security import build_digital_signature_hash, hash_password


def _default_twelve_steps(completed_up_to: int) -> list[dict]:
    titles = [
        "1. Admisión de impotencia y aceptación",
        "2. Creer en un poder superior restaurador",
        "3. Decisión de confiar la voluntad y la vida",
        "4. Inventario moral minucioso y valiente",
        "5. Admisión exacta de la naturaleza de las faltas",
        "6. Disposición para liberar defectos de carácter",
        "7. Humildad para el cambio personal",
        "8. Lista de personas a quienes se causó daño",
        "9. Reparación directa y responsable de daños",
        "10. Inventario personal diario continuo",
        "11. Oración, meditación y contacto consciente",
        "12. Despertar espiritual y servicio a otros",
    ]
    result = []
    for idx, title in enumerate(titles, start=1):
        status = "COMPLETADO" if idx < completed_up_to else ("EN_PROCESO" if idx == completed_up_to else "PENDIENTE")
        result.append({"step": idx, "title": title, "status": status, "notes": ""})
    return result


def seed_initial_data(db: Session) -> None:
    """Inicializa institución, roles RBAC y cuenta Master única (abun / ÁNGELES DE ESPERANZA)."""
    institution = db.query(Institution).filter(Institution.code == "ANGELES-IRA-01").first()
    if not institution:
        institution = Institution(
            code="ANGELES-IRA-01",
            name="Ángeles de Esperanza A.C.",
            legal_name="Centro de Rehabilitación en Adicciones Ángeles de Esperanza A.C.",
            city="Irapuato",
            state="Guanajuato",
            country="México",
            website="https://angelesdeesperanzaac.org",
            domain="https://braher.org/angeles",
            phone="+52 (462) 000-0000",
            email="contacto@angelesdeesperanzaac.org",
            address="Irapuato, Guanajuato, México",
        )
        db.add(institution)
        db.flush()

    roles_catalog = [
        ("ADMIN", "Superadministrador Master", "Control total clínico, autorización de profesionales, auditoría e impresión"),
        ("DOCTOR", "Médico", "Área médica, signos vitales, recetas, desintoxicación, SOAP y altas"),
        ("PSYCHIATRIST", "Psiquiatra", "Área médica y psiquiátrica, diagnósticos CIE-11/DSM-5, recetas, SOAP y altas"),
        ("PSYCHOLOGIST", "Psicólogo", "Evaluación psicológica, pruebas psicométricas, CIE-11/DSM-5, SOAP y altas"),
        ("COUNSELOR", "Consejero en Adicciones", "Programa de 12 Pasos, sesiones individuales/grupales y notas SOAP"),
        ("NUTRITIONIST", "Nutriólogo", "Evaluación nutricional, seguimiento médico-nutricional, SOAP y expansión"),
        ("ADMISSION", "Admisión e Ingreso", "Gestión de ingreso, consentimiento e inventario"),
        ("SOCIAL_WORKER", "Trabajo Social", "Estudio socioeconómico, entorno familiar y seguimiento post-egreso"),
    ]
    role_map: dict[str, Role] = {}
    for code, display_name, desc in roles_catalog:
        role = (
            db.query(Role)
            .filter(Role.institution_id == institution.id, Role.code == code)
            .first()
        )
        if not role:
            role = Role(
                institution_id=institution.id,
                code=code,
                display_name=display_name,
                description=desc,
                permissions_json=RBAC_MATRIX.get(code, {}),
            )
            db.add(role)
            db.flush()
        role_map[code] = role

    # Única cuenta Master preconfigurada: abun / ábba / ÁNGELES DE ESPERANZA
    master_user = db.query(User).filter(User.username == "abun").first()
    if not master_user:
        master_user = User(
            institution_id=institution.id,
            role_id=role_map["ADMIN"].id,
            username="abun",
            email="contacto@angelesdeesperanzaac.org",
            full_name="ÁNGELES DE ESPERANZA",
            professional_license="MASTER-ANGELES",
            specialty="Dirección General y Superadministración",
            password_hash=hash_password("ábba"),
            approval_status="APPROVED",
            is_active=True,
        )
        db.add(master_user)
        db.flush()

    # Sembrar 2 expedientes de ejemplo inicial si la base está vacía
    if db.query(Patient).filter(Patient.institution_id == institution.id).count() == 0:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        today = date.today()

        p1 = Patient(
            institution_id=institution.id,
            folio="ANG-2026-001",
            first_name="Carlos Alberto",
            last_name="Hernández López",
            curp="HELC920514HGTLRN04",
            birth_date=date(1992, 5, 14),
            gender="Masculino",
            marital_status="Soltero",
            education_level="Preparatoria",
            occupation="Técnico Electricista",
            phone="462-118-4520",
            address="Col. Las Reynas, Irapuato, Guanajuato",
            emergency_contact_name="María Guadalupe López",
            emergency_contact_rel="Madre",
            emergency_contact_phone="462-118-9901",
            status="ADMITTED",
            admission_date=now - timedelta(days=18),
            planned_discharge_date=today + timedelta(days=28),
            alert_flag=True,
            alert_summary="Seguimiento por ansiedad leve e insomnio en ajuste farmacológico",
            created_by_user_id=master_user.id,
        )
        p2 = Patient(
            institution_id=institution.id,
            folio="ANG-2026-002",
            first_name="Miguel Ángel",
            last_name="Sánchez Morales",
            curp="SAMM881103HGTNRZ09",
            birth_date=date(1988, 11, 3),
            gender="Masculino",
            marital_status="Casado",
            education_level="Licenciatura trunca",
            occupation="Comerciante",
            phone="462-204-3190",
            address="Col. Moderna, Irapuato, Guanajuato",
            emergency_contact_name="Patricia Gómez Ruiz",
            emergency_contact_rel="Esposa",
            emergency_contact_phone="462-204-8821",
            status="ADMITTED",
            admission_date=now - timedelta(days=42),
            planned_discharge_date=today + timedelta(days=12),
            alert_flag=False,
            created_by_user_id=master_user.id,
        )
        db.add_all([p1, p2])
        db.flush()

        db.add(Admission(
            institution_id=institution.id,
            patient_id=p1.id,
            admission_type="VOLUNTARIO",
            referral_source="Solicitud familiar directa",
            admission_reason="Acompañamiento integral de rehabilitación residencial.",
            guardian_name="María Guadalupe López",
            guardian_relationship="Madre",
            consent_accepted=True,
            consent_signer_name="María Guadalupe López",
            consent_signer_role="FAMILIAR_RESPONSABLE",
            consent_signature_hash=build_digital_signature_hash({"folio": p1.folio, "signer": "María Guadalupe López"}),
            consent_signed_at=now - timedelta(days=18),
            belongings_inventory_json=[
                {"item": "Teléfono celular", "quantity": 1, "condition": "Bueno (en resguardo)", "notes": "Apagado con funda"},
                {"item": "Credencial INE", "quantity": 1, "condition": "Bueno", "notes": "En expediente"},
            ],
            updated_by_user_id=master_user.id,
        ))
        db.add(MedicalRecord(
            institution_id=institution.id,
            patient_id=p1.id,
            blood_type="O+",
            allergies="Negadas",
            pathological_history="Gastritis leve en remisión.",
            primary_substance="Alcohol / Estimulantes",
            years_of_use=6,
            physical_exam_summary="Consciente, orientado, buena hidratación.",
            detox_protocol="Hidratación oral, complejo B y vigilancia del sueño.",
            prescriptions_json=[
                {"medication": "Complejo B + Tiamina", "dose": "100 mg", "frequency": "Cada 24 horas", "route": "Oral", "status": "ACTIVO"},
            ],
            attending_physician_id=master_user.id,
        ))
        db.add(VitalSign(
            institution_id=institution.id,
            patient_id=p1.id,
            bp_systolic=122,
            bp_diastolic=80,
            heart_rate=76,
            respiratory_rate=17,
            temperature_c=36.5,
            spo2_percent=98,
            glucose_mg_dl=94,
            observations="Signos estables en valoración matutina.",
            recorded_by_user_id=master_user.id,
            recorded_at=now - timedelta(hours=6),
        ))
        db.add(PsychologicalRecord(
            institution_id=institution.id,
            patient_id=p1.id,
            anamnesis="Ansiedad situacional moderada con buena respuesta terapéutica.",
            cie11_code="6C40.2",
            dsm5_code="F10.20",
            diagnosis_description="Trastorno por consumo en remisión temprana; ansiedad situacional leve.",
            risk_level="BAJO",
            treatment_plan="Psicoterapia cognitivo-conductual semanal y sesión familiar.",
            psychometric_tests_json=[{"test": "Inventario de Ansiedad de Beck (BAI)", "date": str(today - timedelta(days=14)), "score": "16 pts", "interpretation": "Ansiedad leve"}],
            specialist_user_id=master_user.id,
        ))
        db.add(CounselingRecord(
            institution_id=institution.id,
            patient_id=p1.id,
            current_step=4,
            steps_progress_json=_default_twelve_steps(4),
            mentor_name="Consejería Institucional",
            counselor_notes="Participación respetuosa y constante en sesiones diarias.",
            sessions_log_json=[{"session_date": str(today - timedelta(days=3)), "session_type": "INDIVIDUAL", "step_focus": 4, "summary": "Revisión guiada de inventario personal.", "agreements": "Reflexión escrita del 4º Paso."}],
            counselor_user_id=master_user.id,
        ))

        sig_time = now - timedelta(hours=5)
        soap_s = "Paciente refiere mejoría en el descanso nocturno y disposición al proceso terapéutico."
        soap_o = "TA 122/80 mmHg, FC 76 lpm, SpO2 98%. Tranquilo, orientado y participativo."
        soap_a = "Evolución clínica favorable en fase de estabilización."
        soap_p = "1. Continuar plan terapéutico multidisciplinario.\n2. Seguimiento en Psicología y Consejería."
        db.add(SoapNote(
            institution_id=institution.id,
            patient_id=p1.id,
            note_category="EVOLUCION_CLINICA",
            subjective=soap_s,
            objective=soap_o,
            assessment=soap_a,
            plan=soap_p,
            ai_assisted=False,
            is_addendum=False,
            created_by_user_id=master_user.id,
            author_name=master_user.full_name,
            author_role="ADMIN",
            professional_license=master_user.professional_license,
            digital_signature_hash=build_digital_signature_hash({"patient_id": p1.id, "signed_at": sig_time.isoformat()}),
            signed_at=sig_time,
            created_at=sig_time,
        ))
        db.add(SocialWorkRecord(
            institution_id=institution.id,
            patient_id=p1.id,
            socioeconomic_level="Medio-bajo estable",
            housing_conditions="Casa familiar en Irapuato, Guanajuato.",
            family_structure="Red familiar receptiva y comprometida.",
            support_network_score=8,
            family_visits_json=[],
            updated_by_user_id=master_user.id,
        ))
        db.add(LabScreening(
            institution_id=institution.id,
            patient_id=p1.id,
            test_type="Panel Toxicológico Antidoping (6 parámetros)",
            performed_at=now - timedelta(days=4),
            result_summary="NEGATIVO en los 6 parámetros evaluados",
            substances_json={},
            recorded_by_user_id=master_user.id,
        ))
        db.add(PostDischargeFollowup(
            institution_id=institution.id,
            patient_id=p2.id,
            milestone_months=1,
            scheduled_date=today + timedelta(days=42),
            contact_channel="LLAMADA",
            status="PROGRAMADO",
            notes="Primer seguimiento post-egreso.",
            assigned_user_id=master_user.id,
        ))
        db.add(AuditLog(
            institution_id=institution.id,
            user_id=master_user.id,
            role="ADMIN",
            action="SYSTEM_BOOTSTRAP",
            table_name="institutions",
            record_id=str(institution.id),
            details="Inicialización del sistema ÁNGELES — Ángeles de Esperanza A.C.",
            ip_address="127.0.0.1",
        ))

    db.commit()
