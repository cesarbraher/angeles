/*
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 *
 * Script SQL Maestro — Optimizado para MySQL 8.0 / MariaDB (utf8mb4_unicode_ci)
 * Base de Datos Fase Beta: u529127178_adulam
 * Arquitectura Multi-Tenant lista para migración futura a PostgreSQL.
 */

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. INSTITUCIONES (MULTI-TENANT ROOT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS institutions (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code            VARCHAR(40)     NOT NULL,
    name            VARCHAR(180)    NOT NULL,
    legal_name      VARCHAR(220)    NOT NULL,
    city            VARCHAR(100)    NOT NULL DEFAULT 'Irapuato',
    state           VARCHAR(100)    NOT NULL DEFAULT 'Guanajuato',
    country         VARCHAR(100)    NOT NULL DEFAULT 'México',
    website         VARCHAR(180)    NULL,
    domain          VARCHAR(180)    NULL,
    phone           VARCHAR(40)     NULL,
    email           VARCHAR(150)    NULL,
    address         TEXT            NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_institutions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. ROLES DEL SISTEMA (MATRIZ RBAC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id  BIGINT UNSIGNED NOT NULL DEFAULT 1,
    code            VARCHAR(40)     NOT NULL,
    display_name    VARCHAR(100)    NOT NULL,
    description     VARCHAR(255)    NULL,
    permissions_json JSON           NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_inst_code (institution_id, code),
    CONSTRAINT fk_roles_institution FOREIGN KEY (institution_id) REFERENCES institutions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. USUARIOS Y CREDENCIALES PROFESIONALES
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id         BIGINT UNSIGNED NOT NULL DEFAULT 1,
    role_id                BIGINT UNSIGNED NOT NULL,
    username               VARCHAR(80)     NOT NULL,
    email                  VARCHAR(160)    NOT NULL,
    full_name              VARCHAR(180)    NOT NULL,
    professional_license   VARCHAR(80)     NULL COMMENT 'Cédula Profesional / Certificación',
    specialty              VARCHAR(120)    NULL,
    curp                   VARCHAR(18)     NULL,
    rfc                    VARCHAR(13)     NULL,
    birth_date             DATE            NULL,
    phone                  VARCHAR(40)     NULL,
    address                TEXT            NULL,
    university             VARCHAR(180)    NULL,
    graduation_year        INT             NULL,
    experience_years       INT             NULL,
    bio                    TEXT            NULL,
    documents_json         JSON            NULL COMMENT 'Documentos aprobatorios (imágenes/PDFs) adjuntados al registro',
    default_signature_data LONGTEXT        NULL COMMENT 'Firma autógrafa digital del profesional',
    approval_status        ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    rejection_reason       TEXT            NULL,
    approved_by_user_id    BIGINT UNSIGNED NULL,
    approved_at            DATETIME        NULL,
    password_hash          VARCHAR(255)    NOT NULL,
    is_active              TINYINT(1)      NOT NULL DEFAULT 1,
    last_login_at          DATETIME        NULL,
    created_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_username (username),
    KEY idx_users_institution (institution_id),
    KEY idx_users_role (role_id),
    KEY idx_users_approval (institution_id, approval_status),
    CONSTRAINT fk_users_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. PACIENTES / EXPEDIENTES CLÍNICOS (FOLIO ANG-2026-XXX)
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id          BIGINT UNSIGNED NOT NULL DEFAULT 1,
    folio                   VARCHAR(32)     NOT NULL COMMENT 'Ej. ANG-2026-001',
    first_name              VARCHAR(100)    NOT NULL,
    last_name               VARCHAR(120)    NOT NULL,
    curp                    VARCHAR(18)     NULL,
    birth_date              DATE            NULL,
    gender                  VARCHAR(32)     NULL,
    marital_status          VARCHAR(40)     NULL,
    education_level         VARCHAR(80)     NULL,
    occupation              VARCHAR(100)    NULL,
    phone                   VARCHAR(40)     NULL,
    address                 TEXT            NULL,
    emergency_contact_name  VARCHAR(160)    NULL,
    emergency_contact_rel   VARCHAR(80)     NULL,
    emergency_contact_phone VARCHAR(40)     NULL,
    status                  ENUM('ADMITTED', 'DISCHARGED', 'TRANSFERRED') NOT NULL DEFAULT 'ADMITTED',
    admission_date          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    planned_discharge_date  DATE            NULL,
    alert_flag              TINYINT(1)      NOT NULL DEFAULT 0,
    alert_summary           VARCHAR(255)    NULL,
    created_by_user_id      BIGINT UNSIGNED NULL,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_patients_inst_folio (institution_id, folio),
    KEY idx_patients_curp (curp),
    KEY idx_patients_status (institution_id, status),
    KEY idx_patients_name (last_name, first_name),
    CONSTRAINT fk_patients_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_patients_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. MÓDULO 1: ADMISIÓN, CONSENTIMIENTO INFORMADO E INVENTARIO
-- ============================================================================
CREATE TABLE IF NOT EXISTS admissions (
    id                        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id            BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id                BIGINT UNSIGNED NOT NULL,
    admission_type            VARCHAR(60)     NOT NULL DEFAULT 'VOLUNTARIO',
    referral_source           VARCHAR(160)    NULL,
    admission_reason          TEXT            NULL,
    guardian_name             VARCHAR(160)    NULL,
    guardian_id_number        VARCHAR(80)     NULL,
    guardian_relationship     VARCHAR(80)     NULL,
    consent_accepted          TINYINT(1)      NOT NULL DEFAULT 0,
    consent_version           VARCHAR(32)     NOT NULL DEFAULT 'v1.0-2026',
    consent_signer_name       VARCHAR(160)    NULL,
    consent_signer_role       VARCHAR(60)     NULL COMMENT 'PACIENTE | FAMILIAR_RESPONSABLE',
    consent_signature_data    LONGTEXT        NULL COMMENT 'Base64 PNG del HTML5 Canvas capacitivo',
    consent_signature_hash    CHAR(64)        NULL COMMENT 'SHA-256 de integridad del consentimiento',
    consent_signed_at         DATETIME        NULL,
    belongings_inventory_json JSON            NULL COMMENT 'Lista de objetos personales entregados al ingreso',
    belongings_notes          TEXT            NULL,
    signatures_json           JSON            NULL COMMENT 'Firmas digitales y biometría (profesional, paciente y familiar)',
    updated_by_user_id        BIGINT UNSIGNED NULL,
    created_at                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admissions_patient (patient_id),
    KEY idx_admissions_institution (institution_id),
    CONSTRAINT fk_admissions_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_admissions_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_admissions_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. MÓDULO 2: ÁREA MÉDICA Y SIGNOS VITALES CONTINUOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id           BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id               BIGINT UNSIGNED NOT NULL,
    blood_type               VARCHAR(10)     NULL,
    allergies                TEXT            NULL,
    pathological_history     TEXT            NULL,
    substance_use_history    TEXT            NULL,
    primary_substance        VARCHAR(120)    NULL,
    years_of_use             INT             NULL,
    physical_exam_summary    TEXT            NULL,
    detox_protocol           TEXT            NULL,
    prescriptions_json       JSON            NULL COMMENT 'Recetas y control de administración de medicamentos',
    medical_alerts           TEXT            NULL,
    signatures_json          JSON            NULL COMMENT 'Firmas digitales y biometría (profesional, paciente y familiar)',
    attending_physician_id   BIGINT UNSIGNED NULL,
    created_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_medical_patient (patient_id),
    KEY idx_medical_institution (institution_id),
    CONSTRAINT fk_medical_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_medical_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_medical_physician FOREIGN KEY (attending_physician_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vital_signs (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id      BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id          BIGINT UNSIGNED NOT NULL,
    bp_systolic         INT             NULL COMMENT 'TA Sistólica mmHg',
    bp_diastolic        INT             NULL COMMENT 'TA Diastólica mmHg',
    heart_rate          INT             NULL COMMENT 'FC lpm',
    respiratory_rate    INT             NULL COMMENT 'FR rpm',
    temperature_c       DECIMAL(4,1)    NULL COMMENT 'Temp °C',
    spo2_percent        INT             NULL COMMENT 'SpO2 %',
    glucose_mg_dl       INT             NULL COMMENT 'Glucosa mg/dL',
    observations        VARCHAR(255)    NULL,
    recorded_by_user_id BIGINT UNSIGNED NOT NULL,
    recorded_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_vitals_inst_patient (institution_id, patient_id, recorded_at),
    CONSTRAINT fk_vitals_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_vitals_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_vitals_user FOREIGN KEY (recorded_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. MÓDULO 3: PSICOLOGÍA Y PSIQUIATRÍA (CIE-11 / DSM-5)
-- ============================================================================
CREATE TABLE IF NOT EXISTS psychological_records (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id          BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id              BIGINT UNSIGNED NOT NULL,
    anamnesis               TEXT            NULL,
    life_history            TEXT            NULL,
    mental_status_exam      TEXT            NULL,
    psychometric_tests_json JSON            NULL COMMENT 'Pruebas psicométricas aplicadas y puntajes',
    cie11_code              VARCHAR(40)     NULL COMMENT 'Codificación diagnóstica CIE-11',
    dsm5_code               VARCHAR(60)     NULL COMMENT 'Codificación diagnóstica DSM-5',
    diagnosis_description   TEXT            NULL,
    risk_level              ENUM('BAJO', 'MODERADO', 'ALTO') NOT NULL DEFAULT 'BAJO',
    treatment_plan          TEXT            NULL,
    therapeutic_goals_json  JSON            NULL,
    signatures_json         JSON            NULL COMMENT 'Firmas digitales y biometría (profesional, paciente y familiar)',
    specialist_user_id      BIGINT UNSIGNED NULL,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_psych_patient (patient_id),
    KEY idx_psych_institution (institution_id),
    CONSTRAINT fk_psych_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_psych_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_psych_specialist FOREIGN KEY (specialist_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. MÓDULO 4: CONSEJERÍA Y MENTORÍA (PROGRAMA 12 PASOS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS counseling_records (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id        BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id            BIGINT UNSIGNED NOT NULL,
    current_step          TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Paso actual 1 a 12',
    steps_progress_json   JSON            NULL COMMENT 'Detalle por paso (1..12) estado y reflexiones',
    mentor_name           VARCHAR(160)    NULL,
    counselor_notes       TEXT            NULL,
    sessions_log_json     JSON            NULL COMMENT 'Bitácora de sesiones individuales, grupales y mentoría',
    signatures_json       JSON            NULL COMMENT 'Firmas digitales y biometría (profesional, paciente y familiar)',
    counselor_user_id     BIGINT UNSIGNED NULL,
    created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_counseling_patient (patient_id),
    KEY idx_counseling_institution (institution_id),
    CONSTRAINT fk_counseling_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_counseling_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_counseling_user FOREIGN KEY (counselor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. MÓDULO 5: NOTAS DE EVOLUCIÓN DIARIA (SOAP INMUTABLE + SHA-256 + ADENDAS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS soap_notes (
    id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id         BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id             BIGINT UNSIGNED NOT NULL,
    note_category          VARCHAR(60)     NOT NULL DEFAULT 'EVOLUCION_CLINICA',
    subjective             TEXT            NOT NULL,
    objective              TEXT            NOT NULL,
    assessment             TEXT            NOT NULL,
    plan                   TEXT            NOT NULL,
    raw_dictation          TEXT            NULL,
    ai_assisted            TINYINT(1)      NOT NULL DEFAULT 0,
    is_addendum            TINYINT(1)      NOT NULL DEFAULT 0,
    parent_note_id         BIGINT UNSIGNED NULL COMMENT 'Referencia a la nota original si es Adenda/Aclaratoria',
    created_by_user_id     BIGINT UNSIGNED NOT NULL,
    author_name            VARCHAR(180)    NOT NULL,
    author_role            VARCHAR(60)     NOT NULL,
    professional_license   VARCHAR(80)     NULL,
    digital_signature_hash CHAR(64)        NOT NULL COMMENT 'SHA-256 inmutable de firma profesional',
    signatures_json        JSON            NULL COMMENT 'Firmas digitales y biometría (profesional, paciente y familiar)',
    signed_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_soap_inst_patient (institution_id, patient_id, created_at),
    KEY idx_soap_parent (parent_note_id),
    CONSTRAINT fk_soap_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_soap_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_soap_user FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_soap_parent FOREIGN KEY (parent_note_id) REFERENCES soap_notes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. MÓDULO 6: EGRESO / ALTA Y PLAN DE PREVENCIÓN DE RECAÍDAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS discharges (
    id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id           BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id               BIGINT UNSIGNED NOT NULL,
    discharge_type           ENUM('MEDICAL_THERAPEUTIC', 'VOLUNTARY', 'TRANSFER') NOT NULL DEFAULT 'MEDICAL_THERAPEUTIC',
    discharge_date           DATETIME        NULL,
    clinical_summary         TEXT            NULL,
    belongings_returned      TINYINT(1)      NOT NULL DEFAULT 0,
    belongings_return_notes  TEXT            NULL,
    relapse_prevention_plan  TEXT            NULL,
    triggers_identified      TEXT            NULL,
    support_commitments      TEXT            NULL,
    authorized_by_user_id    BIGINT UNSIGNED NULL,
    digital_signature_hash   CHAR(64)        NULL,
    signatures_json          JSON            NULL COMMENT 'Firmas digitales y biometría (profesional, paciente y familiar)',
    created_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_discharges_patient (patient_id),
    KEY idx_discharges_institution (institution_id),
    CONSTRAINT fk_discharges_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_discharges_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_discharges_authorizer FOREIGN KEY (authorized_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. MÓDULOS DE EXPANSIÓN: TRABAJO SOCIAL, LABORATORIO Y SEGUIMIENTO POST-ALTA
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_work_records (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id        BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id            BIGINT UNSIGNED NOT NULL,
    socioeconomic_level   VARCHAR(60)     NULL,
    housing_conditions    TEXT            NULL,
    family_structure      TEXT            NULL,
    support_network_score TINYINT UNSIGNED NULL COMMENT 'Escala 1-10',
    family_visits_json    JSON            NULL COMMENT 'Bitácora de visitas y terapia familiar',
    observations          TEXT            NULL,
    signatures_json       JSON            NULL COMMENT 'Firmas digitales y biometría (profesional, paciente y familiar)',
    updated_by_user_id    BIGINT UNSIGNED NULL,
    created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_social_patient (patient_id),
    KEY idx_social_institution (institution_id),
    CONSTRAINT fk_social_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_social_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_social_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lab_screenings (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id      BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id          BIGINT UNSIGNED NOT NULL,
    test_type           VARCHAR(120)    NOT NULL COMMENT 'Antidoping 6 parámetros, BH, QS, etc.',
    performed_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    result_summary      VARCHAR(160)    NOT NULL,
    substances_json     JSON            NULL COMMENT 'Detalle de sustancias detectadas/negativas',
    notes               TEXT            NULL,
    recorded_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_lab_inst_patient (institution_id, patient_id, performed_at),
    CONSTRAINT fk_lab_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_lab_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_lab_user FOREIGN KEY (recorded_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_discharge_followups (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id      BIGINT UNSIGNED NOT NULL DEFAULT 1,
    patient_id          BIGINT UNSIGNED NOT NULL,
    milestone_months    TINYINT UNSIGNED NOT NULL COMMENT '1, 3, 6 o 12 meses post-alta',
    scheduled_date      DATE            NOT NULL,
    contact_channel     VARCHAR(40)     NOT NULL DEFAULT 'LLAMADA',
    status              ENUM('PROGRAMADO', 'COMPLETADO', 'SIN_RESPUESTA', 'REPROGRAMADO') NOT NULL DEFAULT 'PROGRAMADO',
    abstinence_status   VARCHAR(80)     NULL,
    notes               TEXT            NULL,
    assigned_user_id    BIGINT UNSIGNED NULL,
    completed_at        DATETIME        NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_followup_inst_patient (institution_id, patient_id, scheduled_date),
    CONSTRAINT fk_followup_institution FOREIGN KEY (institution_id) REFERENCES institutions(id),
    CONSTRAINT fk_followup_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_followup_user FOREIGN KEY (assigned_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. AUDITORÍA INMUTABLE (NORMATIVA CLÍNICA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    institution_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
    user_id        BIGINT UNSIGNED NULL,
    role           VARCHAR(60)     NOT NULL,
    action         VARCHAR(80)     NOT NULL,
    table_name     VARCHAR(80)     NOT NULL,
    record_id      VARCHAR(64)     NULL,
    details        TEXT            NULL,
    ip_address     VARCHAR(64)     NULL,
    created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_inst_time (institution_id, created_at),
    KEY idx_audit_user (user_id),
    KEY idx_audit_table (table_name, record_id),
    CONSTRAINT fk_audit_institution FOREIGN KEY (institution_id) REFERENCES institutions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TRIGGERS DE INMUTABILIDAD (IMPEDIR BORRADO DE NOTAS SOAP Y AUDITORÍA)
-- ============================================================================
DROP TRIGGER IF EXISTS trg_audit_logs_no_update;
DROP TRIGGER IF EXISTS trg_audit_logs_no_delete;
DROP TRIGGER IF EXISTS trg_soap_notes_no_delete;

DELIMITER //
CREATE TRIGGER trg_audit_logs_no_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'VIOLACIÓN DE INTEGRIDAD: audit_logs es estrictamente inmutable.';
END//

CREATE TRIGGER trg_audit_logs_no_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'VIOLACIÓN DE INTEGRIDAD: No se permite eliminar registros de audit_logs.';
END//

CREATE TRIGGER trg_soap_notes_no_delete
BEFORE DELETE ON soap_notes
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'NORMATIVA CLÍNICA: Las notas SOAP firmadas no pueden eliminarse; utilice una Nota Aclaratoria / Adenda.';
END//
DELIMITER ;

-- ============================================================================
-- DATOS SEMILLA INICIALES (FASE BETA — ÁNGELES DE ESPERANZA A.C.)
-- ============================================================================
INSERT INTO institutions (id, code, name, legal_name, city, state, country, website, domain, phone, email, address)
VALUES (
    1,
    'ANGELES-IRA-01',
    'Ángeles de Esperanza A.C.',
    'Centro de Rehabilitación en Adicciones Ángeles de Esperanza A.C.',
    'Irapuato',
    'Guanajuato',
    'México',
    'https://angelesdeesperanzaac.org',
    'https://cebraher.org/angeles',
    '+52 (462) 000-0000',
    'contacto@angelesdeesperanzaac.org',
    'Irapuato, Guanajuato, México'
) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO roles (id, institution_id, code, display_name, description) VALUES
    (1, 1, 'ADMIN',         'Superadministrador Master', 'Control total clínico, autorización de profesionales, auditoría e impresión'),
    (2, 1, 'DOCTOR',        'Médico',                    'Área médica, signos vitales, recetas, SOAP y altas'),
    (3, 1, 'PSYCHIATRIST',  'Psiquiatra',                'Área médica y psiquiátrica, CIE-11/DSM-5, recetas, SOAP y altas'),
    (4, 1, 'PSYCHOLOGIST',  'Psicólogo',                 'Evaluación psicológica CIE-11/DSM-5, SOAP y altas'),
    (5, 1, 'COUNSELOR',     'Consejero en Adicciones',   'Programa de 12 Pasos, sesiones y notas SOAP'),
    (6, 1, 'NUTRITIONIST',  'Nutriólogo',                'Evaluación nutricional, seguimiento médico-nutricional y SOAP'),
    (7, 1, 'ADMISSION',     'Admisión e Ingreso',        'Gestión de ingreso, consentimiento e inventario'),
    (8, 1, 'SOCIAL_WORKER', 'Trabajo Social',            'Estudio socioeconómico, entorno familiar y seguimiento')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Cuenta Master Única: usuario "abun" — ÁNGELES DE ESPERANZA
INSERT INTO users (id, institution_id, role_id, username, email, full_name, professional_license, specialty, approval_status, password_hash, is_active) VALUES
    (1, 1, 1, 'abun', 'contacto@angelesdeesperanzaac.org', 'ÁNGELES DE ESPERANZA', 'MASTER-ANGELES', 'Dirección General y Superadministración', 'APPROVED', '$2b$12$x.xw8s7lVK76GpngjsdK8.haNmUO1PmBbXKrxTLJSoX2uCXFzo/2u', 1)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- Pacientes de ejemplo inicial
INSERT INTO patients (id, institution_id, folio, first_name, last_name, curp, birth_date, gender, marital_status, education_level, occupation, phone, address, emergency_contact_name, emergency_contact_rel, emergency_contact_phone, status, planned_discharge_date, alert_flag, alert_summary, created_by_user_id) VALUES
    (1, 1, 'ANG-2026-001', 'Carlos Alberto', 'Hernández López', 'HELC920514HGTLRN04', '1992-05-14', 'Masculino', 'Soltero', 'Preparatoria', 'Técnico Electricista', '462-118-4520', 'Col. Las Reynas, Irapuato, Gto.', 'María Guadalupe López', 'Madre', '462-118-9901', 'ADMITTED', DATE_ADD(CURDATE(), INTERVAL 28 DAY), 1, 'Seguimiento por ansiedad leve e insomnio en ajuste farmacológico', 1),
    (2, 1, 'ANG-2026-002', 'Miguel Ángel', 'Sánchez Morales', 'SAMM881103HGTNRZ09', '1988-11-03', 'Masculino', 'Casado', 'Licenciatura trunca', 'Comerciante', '462-204-3190', 'Col. Moderna, Irapuato, Gto.', 'Patricia Gómez Ruiz', 'Esposa', '462-204-8821', 'ADMITTED', DATE_ADD(CURDATE(), INTERVAL 12 DAY), 0, NULL, 1)
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name);

SET FOREIGN_KEY_CHECKS = 1;
