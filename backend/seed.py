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
        if idx < completed_up_to:
            status = "COMPLETADO"
        elif idx == completed_up_to:
            status = "EN_PROCESO"
        else:
            status = "PENDIENTE"
        result.append({"step": idx, "title": title, "status": status, "notes": ""})
    return result


def seed_initial_data(db: Session) -> None:
    """Inicializa institución, roles RBAC, personal base y expedientes beta de manera idempotente."""
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
            domain="https://cebraher.org/angeles",
            phone="+52 (462) 000-0000",
            email="contacto@angelesdeesperanzaac.org",
            address="Irapuato, Guanajuato, México",
        )
        db.add(institution)
        db.flush()

    roles_catalog = [
        ("ADMIN", "Administrador del Sistema", "Control total clínico, administrativo y auditoría"),
        ("ADMISSION", "Admisión e Ingreso", "Gestión de ingreso, consentimiento e inventario"),
        ("DOCTOR", "Médico Titular", "Área médica, signos vitales, recetas, SOAP y altas"),
        ("PSYCHOLOGIST", "Psicólogo / Psiquiatra", "Evaluación psicológica CIE-11/DSM-5, SOAP y altas"),
        ("COUNSELOR", "Consejero / Mentor", "Programa de 12 Pasos, sesiones y notas SOAP"),
        ("SOCIAL_WORKER", "Trabajo Social", "Estudio socioeconómico, entorno familiar y seguimiento"),
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

    default_pw_hash = hash_password("Angeles2026!")
    users_seed = [
        ("cesarbraher", "cesarbraher@gmail.com", "César Augusto Bravo Hernández", "ADMIN", "DEVREL-GOOGLE-2026", "Arquitecto del Sistema / Dirección Técnica"),
        ("dr.mendoza", "medico@angelesdeesperanzaac.org", "Dra. Elena Mendoza Ríos", "DOCTOR", "CED-MED-8945120", "Medicina General y Adicciones"),
        ("psi.navarro", "psicologia@angelesdeesperanzaac.org", "Mtro. Ricardo Navarro Silva", "PSYCHOLOGIST", "CED-PSI-7712045", "Psicología Clínica y Psicoterapia"),
        ("con.ramirez", "consejeria@angelesdeesperanzaac.org", "Luis Fernando Ramírez", "COUNSELOR", "CERT-CONADIC-4412", "Consejería en Adicciones — 12 Pasos"),
        ("adm.torres", "admision@angelesdeesperanzaac.org", "Lic. Sofía Torres Vega", "ADMISSION", "ADM-IRA-2026", "Coordinación de Admisión e Ingreso"),
        ("ts.delgado", "trabajosocial@angelesdeesperanzaac.org", "Lic. Carmen Delgado Cruz", "SOCIAL_WORKER", "CED-TS-6182301", "Trabajo Social y Terapia Familiar"),
    ]
    user_map: dict[str, User] = {}
    for username, email, full_name, role_code, lic, spec in users_seed:
        usr = db.query(User).filter(User.username == username).first()
        if not usr:
            usr = User(
                institution_id=institution.id,
                role_id=role_map[role_code].id,
                username=username,
                email=email,
                full_name=full_name,
                professional_license=lic,
                specialty=spec,
                password_hash=default_pw_hash,
                is_active=True,
            )
            db.add(usr)
            db.flush()
        user_map[username] = usr

    # Sembrar 3 pacientes representativos si no existen expedientes
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
            created_by_user_id=user_map["adm.torres"].id,
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
            created_by_user_id=user_map["adm.torres"].id,
        )
        p3 = Patient(
            institution_id=institution.id,
            folio="ANG-2026-003",
            first_name="Jorge Eduardo",
            last_name="Vargas Ortega",
            curp="VAOJ950221HGTRGD02",
            birth_date=date(1995, 2, 21),
            gender="Masculino",
            marital_status="Unión libre",
            education_level="Secundaria",
            occupation="Operador industrial",
            phone="462-311-6704",
            address="Fracc. Villas de Irapuato, Guanajuato",
            emergency_contact_name="Roberto Vargas Díaz",
            emergency_contact_rel="Padre",
            emergency_contact_phone="462-311-1208",
            status="DISCHARGED",
            admission_date=now - timedelta(days=95),
            planned_discharge_date=today - timedelta(days=5),
            alert_flag=False,
            created_by_user_id=user_map["adm.torres"].id,
        )
        db.add_all([p1, p2, p3])
        db.flush()

        # Módulo 1: Admisión para p1 y p2
        consent_hash_p1 = build_digital_signature_hash({
            "folio": p1.folio,
            "signer": "María Guadalupe López",
            "version": "v1.0-2026",
            "signed_at": (now - timedelta(days=18)).isoformat(),
        })
        db.add(Admission(
            institution_id=institution.id,
            patient_id=p1.id,
            admission_type="VOLUNTARIO",
            referral_source="Solicitud familiar directa",
            admission_reason="Trastorno por consumo de alcohol y estimulantes con repercusión laboral y familiar.",
            guardian_name="María Guadalupe López",
            guardian_id_number="INE-99104281",
            guardian_relationship="Madre",
            consent_accepted=True,
            consent_signer_name="María Guadalupe López",
            consent_signer_role="FAMILIAR_RESPONSABLE",
            consent_signature_hash=consent_hash_p1,
            consent_signed_at=now - timedelta(days=18),
            belongings_inventory_json=[
                {"item": "Teléfono celular Samsung", "quantity": 1, "condition": "Bueno (en resguardo)", "notes": "Apagado con funda"},
                {"item": "Cartera con credencial INE", "quantity": 1, "condition": "Bueno", "notes": "Sin efectivo"},
                {"item": "Mudas de ropa personal", "quantity": 5, "condition": "Completo", "notes": "Entregado en dormitorio"},
            ],
            belongings_notes="Resguardo verificado ante familiar responsable.",
            updated_by_user_id=user_map["adm.torres"].id,
        ))

        db.add(Admission(
            institution_id=institution.id,
            patient_id=p2.id,
            admission_type="VOLUNTARIO",
            referral_source="Referencia médica externa",
            admission_reason="Dependencia a alcohol de 8 años de evolución; motivación alta de cambio.",
            guardian_name="Patricia Gómez Ruiz",
            guardian_relationship="Esposa",
            consent_accepted=True,
            consent_signer_name="Miguel Ángel Sánchez Morales",
            consent_signer_role="PACIENTE",
            consent_signature_hash=build_digital_signature_hash({"folio": p2.folio, "signer": "Miguel Ángel Sánchez Morales"}),
            consent_signed_at=now - timedelta(days=42),
            belongings_inventory_json=[
                {"item": "Reloj de pulsera", "quantity": 1, "condition": "Bueno", "notes": "En caja fuerte"},
                {"item": "Lentes graduados", "quantity": 1, "condition": "En uso", "notes": "Conserva el paciente"},
            ],
            updated_by_user_id=user_map["adm.torres"].id,
        ))

        # Módulo 2: Área Médica & Signos Vitales
        db.add(MedicalRecord(
            institution_id=institution.id,
            patient_id=p1.id,
            blood_type="O+",
            allergies="Negadas (sin alergias medicamentosas conocidas)",
            pathological_history="Gastritis leve en remisión. Niega diabetes e hipertensión.",
            substance_use_history="Inicio consumo de alcohol a los 17 años; consumo combinado en los últimos 3 años.",
            primary_substance="Alcohol / Estimulantes",
            years_of_use=6,
            physical_exam_summary="Paciente consciente, orientado en las tres esferas, adecuada hidratación, cardiopulmonar sin compromisos.",
            detox_protocol="Protocolo fase estabilización: hidratación oral, complejo B, vigilancia de patrón de sueño y ansiedad.",
            prescriptions_json=[
                {"medication": "Valproato de magnesio", "dose": "400 mg", "frequency": "Cada 12 horas", "route": "Oral", "status": "ACTIVO"},
                {"medication": "Complejo B + Tiamina", "dose": "100 mg", "frequency": "Cada 24 horas", "route": "Oral", "status": "ACTIVO"},
            ],
            medical_alerts="Monitorear calidad del sueño y TA nocturna.",
            attending_physician_id=user_map["dr.mendoza"].id,
        ))
        db.add_all([
            VitalSign(
                institution_id=institution.id,
                patient_id=p1.id,
                bp_systolic=122,
                bp_diastolic=80,
                heart_rate=76,
                respiratory_rate=17,
                temperature_c=36.5,
                spo2_percent=98,
                glucose_mg_dl=94,
                observations="Signos estables en pase de visita matutino.",
                recorded_by_user_id=user_map["dr.mendoza"].id,
                recorded_at=now - timedelta(hours=6),
            ),
            VitalSign(
                institution_id=institution.id,
                patient_id=p1.id,
                bp_systolic=128,
                bp_diastolic=84,
                heart_rate=82,
                respiratory_rate=18,
                temperature_c=36.6,
                spo2_percent=97,
                glucose_mg_dl=98,
                observations="Leve ansiedad vespertina, sin signos de abstinencia aguda.",
                recorded_by_user_id=user_map["dr.mendoza"].id,
                recorded_at=now - timedelta(days=2),
            ),
        ])

        # Módulo 3: Psicología y Psiquiatría
        db.add(PsychologicalRecord(
            institution_id=institution.id,
            patient_id=p1.id,
            anamnesis="Refiere episodios de ansiedad situacional vinculados a presión laboral y conflictos familiares previos al ingreso.",
            life_history="Red familiar primaria receptiva (madre y hermana); buena adherencia a terapia cognitivo-conductual.",
            mental_status_exam="Aliño adecuado, lenguaje coherente y fluido, afecto eutímico con rasgos ansiosos leves, sin ideación autolítica.",
            psychometric_tests_json=[
                {"test": "Inventario de Ansiedad de Beck (BAI)", "date": str(today - timedelta(days=14)), "score": "16 pts", "interpretation": "Ansiedad leve"},
                {"test": "ASSIST OMS", "date": str(today - timedelta(days=17)), "score": "24 pts", "interpretation": "Intervención intensiva"},
            ],
            cie11_code="6C40.2",
            dsm5_code="F10.20 (Trastorno por consumo de alcohol, moderado)",
            diagnosis_description="Trastorno por consumo de sustancias en remisión temprana en entorno controlado; ansiedad situacional leve.",
            risk_level="BAJO",
            treatment_plan="Psicoterapia cognitivo-conductual individual semanal, manejo de detonantes emocionales y sesión vinculante familiar.",
            therapeutic_goals_json=[
                {"goal": "Identificar 5 detonantes emocionales principales", "status": "EN_PROGRESO"},
                {"goal": "Practicar técnicas de regulación respiratoria ante craving", "status": "LOGRADO"},
            ],
            specialist_user_id=user_map["psi.navarro"].id,
        ))

        # Módulo 4: Consejería 12 Pasos
        db.add(CounselingRecord(
            institution_id=institution.id,
            patient_id=p1.id,
            current_step=4,
            steps_progress_json=_default_twelve_steps(4),
            mentor_name="Luis Fernando Ramírez",
            counselor_notes="Participación respetuosa y constante en juntas diarias. Iniciando reflexión escrita del 4º Paso.",
            sessions_log_json=[
                {
                    "session_date": str(today - timedelta(days=3)),
                    "session_type": "INDIVIDUAL",
                    "step_focus": 4,
                    "summary": "Revisión guiada de inventario personal sin juicios; muestra apertura y honestidad.",
                    "agreements": "Redactar tres aprendizajes de honestidad antes del viernes.",
                },
                {
                    "session_date": str(today - timedelta(days=1)),
                    "session_type": "GRUPAL",
                    "step_focus": 3,
                    "summary": "Compartió experiencia en grupo de lectura; retroalimentación constructiva de pares.",
                    "agreements": "Apoyar en bienvenida de nuevos compañeros.",
                },
            ],
            counselor_user_id=user_map["con.ramirez"].id,
        ))

        # Módulo 5: Notas SOAP con firma SHA-256
        soap_s = "Paciente refiere mejoría progresiva en conciliación del sueño; expresa inquietud moderada sobre su futura reinserción laboral."
        soap_o = "Signos vitales estables (TA 122/80 mmHg, FC 76 lpm, SpO2 98%). Cooperador, tranquilo, orientado y participativo en dinámicas matutinas."
        soap_a = "Evolución clínica favorable en fase de estabilización, con ansiedad situacional leve controlada."
        soap_p = "1. Mantener esquema actual con Valproato 400 mg c/12h y Complejo B.\n2. Reforzar herramientas de manejo de estrés en sesión de Psicología.\n3. Continuar avance de 4º Paso en Consejería."
        sig_time = now - timedelta(hours=5)
        sig_hash = build_digital_signature_hash({
            "patient_id": p1.id,
            "author_id": user_map["dr.mendoza"].id,
            "license": user_map["dr.mendoza"].professional_license,
            "subjective": soap_s,
            "objective": soap_o,
            "assessment": soap_a,
            "plan": soap_p,
            "signed_at": sig_time.isoformat(),
        })
        db.add(SoapNote(
            institution_id=institution.id,
            patient_id=p1.id,
            note_category="EVOLUCION_MEDICA",
            subjective=soap_s,
            objective=soap_o,
            assessment=soap_a,
            plan=soap_p,
            ai_assisted=True,
            is_addendum=False,
            created_by_user_id=user_map["dr.mendoza"].id,
            author_name=user_map["dr.mendoza"].full_name,
            author_role="DOCTOR",
            professional_license=user_map["dr.mendoza"].professional_license,
            digital_signature_hash=sig_hash,
            signed_at=sig_time,
            created_at=sig_time,
        ))

        # Módulo 6: Alta para paciente p3
        db.add(Discharge(
            institution_id=institution.id,
            patient_id=p3.id,
            discharge_type="MEDICAL_THERAPEUTIC",
            discharge_date=now - timedelta(days=5),
            clinical_summary="Completó programa residencial de 90 días con cumplimiento médico, psicológico y de 12 Pasos. Egreso con pronóstico favorable.",
            belongings_returned=True,
            belongings_return_notes="Inventario entregado íntegramente con firma de conformidad del paciente y padre.",
            relapse_prevention_plan="Asistencia a 3 juntas semanales de apoyo, sesión psicológica quincenal y llamada de seguimiento institucional a 1, 3, 6 y 12 meses.",
            triggers_identified="Aislamiento nocturno, conflictos interpersonales no expresados y fatiga laboral extrema.",
            support_commitments="Red familiar comprometida (padre y hermana); rutina deportiva matutina.",
            authorized_by_user_id=user_map["dr.mendoza"].id,
            digital_signature_hash=build_digital_signature_hash({"patient_id": p3.id, "type": "MEDICAL_THERAPEUTIC"}),
        ))

        # Módulos de Expansión
        db.add(SocialWorkRecord(
            institution_id=institution.id,
            patient_id=p1.id,
            socioeconomic_level="Medio-bajo estable",
            housing_conditions="Casa propia familiar con todos los servicios básicos en Irapuato.",
            family_structure="Núcleo unido: madre, hermana mayor y sobrinos. Alta disposición para terapia familiar.",
            support_network_score=8,
            family_visits_json=[
                {"date": str(today - timedelta(days=6)), "visitors": "María Guadalupe López (Madre)", "type": "Terapia Familiar", "notes": "Excelente comunicación asertiva y establecimiento de límites sanos."}
            ],
            observations="Red de apoyo sólida para etapa de reinserción.",
            updated_by_user_id=user_map["ts.delgado"].id,
        ))
        db.add(LabScreening(
            institution_id=institution.id,
            patient_id=p1.id,
            test_type="Panel Toxicológico Antidoping (6 parámetros)",
            performed_at=now - timedelta(days=4),
            result_summary="NEGATIVO en los 6 parámetros evaluados",
            substances_json={"THC": "Negativo", "COC": "Negativo", "AMP": "Negativo", "MET": "Negativo", "OPI": "Negativo", "BZO": "Negativo"},
            notes="Control rutinario de seguimiento intrahospitalario.",
            recorded_by_user_id=user_map["dr.mendoza"].id,
        ))
        db.add_all([
            PostDischargeFollowup(
                institution_id=institution.id,
                patient_id=p3.id,
                milestone_months=1,
                scheduled_date=today + timedelta(days=25),
                contact_channel="LLAMADA",
                status="PROGRAMADO",
                notes="Primer control mensual post-alta.",
                assigned_user_id=user_map["ts.delgado"].id,
            ),
            PostDischargeFollowup(
                institution_id=institution.id,
                patient_id=p3.id,
                milestone_months=3,
                scheduled_date=today + timedelta(days=85),
                contact_channel="CITA_PRESENCIAL",
                status="PROGRAMADO",
                notes="Evaluación trimestral con Psicología y Trabajo Social.",
                assigned_user_id=user_map["ts.delgado"].id,
            ),
        ])

        db.add(AuditLog(
            institution_id=institution.id,
            user_id=user_map["cesarbraher"].id,
            role="ADMIN",
            action="SYSTEM_BOOTSTRAP",
            table_name="institutions",
            record_id=str(institution.id),
            details="Inicialización de entorno Beta ÁNGELES para Ángeles de Esperanza A.C.",
            ip_address="127.0.0.1",
        ))

    db.commit()
