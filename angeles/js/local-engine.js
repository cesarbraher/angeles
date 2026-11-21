/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 *
 * Motor local de respaldo para despliegues estáticos (Hostinger public_html sin API Python activa).
 * Cuenta Master única (abun / ábba / ÁNGELES DE ESPERANZA) + registro/autorización de profesionales.
 */

const DB_STORAGE_KEY = "angeles_local_ehr_db_v2";

const RBAC_MATRIX = {
  ADMIN: { admission: "full", medical: "full", psychology: "full", counseling: "full", soap: "full", discharge: "full", expansion: "full", admin: "full" },
  DOCTOR: { admission: "read", medical: "write", psychology: "read", counseling: "none", soap: "write", discharge: "write", expansion: "write", admin: "none" },
  PSYCHIATRIST: { admission: "read", medical: "write", psychology: "write", counseling: "read", soap: "write", discharge: "write", expansion: "write", admin: "none" },
  PSYCHOLOGIST: { admission: "read", medical: "read", psychology: "write", counseling: "read", soap: "write", discharge: "write", expansion: "read", admin: "none" },
  COUNSELOR: { admission: "read", medical: "none", psychology: "none", counseling: "write", soap: "write", discharge: "read", expansion: "none", admin: "none" },
  NUTRITIONIST: { admission: "read", medical: "write", psychology: "none", counseling: "none", soap: "write", discharge: "read", expansion: "write", admin: "none" },
  ADMISSION: { admission: "write", medical: "none", psychology: "none", counseling: "none", soap: "none", discharge: "read", expansion: "read", admin: "none" },
  SOCIAL_WORKER: { admission: "read", medical: "none", psychology: "none", counseling: "none", soap: "write", discharge: "read", expansion: "write", admin: "none" },
};

const ROLE_NAMES = {
  ADMIN: "Superadministrador Master",
  DOCTOR: "Médico",
  PSYCHIATRIST: "Psiquiatra",
  PSYCHOLOGIST: "Psicólogo",
  COUNSELOR: "Consejero en Adicciones",
  NUTRITIONIST: "Nutriólogo",
  ADMISSION: "Admisión e Ingreso",
  SOCIAL_WORKER: "Trabajo Social",
};

const REGISTERABLE_ROLES = new Set(["COUNSELOR", "PSYCHOLOGIST", "DOCTOR", "PSYCHIATRIST", "NUTRITIONIST"]);
const ACCESS_RANK = { none: 0, read: 1, write: 2, full: 3 };

function defaultTwelveSteps(current) {
  const titles = [
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
  ];
  return titles.map((title, idx) => ({
    step: idx + 1,
    title,
    status: idx + 1 < current ? "COMPLETADO" : idx + 1 === current ? "EN_PROCESO" : "PENDIENTE",
    notes: "",
  }));
}

async function sha256Hex(obj) {
  const text = JSON.stringify(obj);
  if (window.crypto?.subtle) {
    const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(64, "0");
}

function createSeedDB() {
  const now = new Date();
  const iso = (daysAgo = 0) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
  const day = (offsetDays = 0) => new Date(now.getTime() + offsetDays * 86400000).toISOString().slice(0, 10);

  return {
    nextIds: { user: 2, patient: 3, vital: 2, soap: 2, lab: 2, followup: 2, audit: 2 },
    users: [
      {
        id: 1,
        institution_id: 1,
        institution_name: "Ángeles de Esperanza A.C.",
        username: "abun",
        email: "contacto@angelesdeesperanzaac.org",
        full_name: "ÁNGELES DE ESPERANZA",
        role_code: "ADMIN",
        role_name: "Superadministrador Master",
        professional_license: "MASTER-ANGELES",
        specialty: "Dirección General y Superadministración",
        approval_status: "APPROVED",
        is_active: true,
        documents_json: [],
        created_at: iso(1),
        last_login_at: null,
        _pw: "ábba",
      },
    ],
    patients: [
      { id: 1, institution_id: 1, folio: "ANG-2026-001", first_name: "Carlos Alberto", last_name: "Hernández López", curp: "HELC920514HGTLRN04", birth_date: "1992-05-14", gender: "Masculino", marital_status: "Soltero", education_level: "Preparatoria", occupation: "Técnico Electricista", phone: "462-118-4520", address: "Col. Las Reynas, Irapuato, Guanajuato", emergency_contact_name: "María Guadalupe López", emergency_contact_rel: "Madre", emergency_contact_phone: "462-118-9901", status: "ADMITTED", admission_date: iso(18), planned_discharge_date: day(28), alert_flag: true, alert_summary: "Seguimiento por ansiedad leve e insomnio en ajuste farmacológico", updated_at: iso(0) },
      { id: 2, institution_id: 1, folio: "ANG-2026-002", first_name: "Miguel Ángel", last_name: "Sánchez Morales", curp: "SAMM881103HGTNRZ09", birth_date: "1988-11-03", gender: "Masculino", marital_status: "Casado", education_level: "Licenciatura trunca", occupation: "Comerciante", phone: "462-204-3190", address: "Col. Moderna, Irapuato, Guanajuato", emergency_contact_name: "Patricia Gómez Ruiz", emergency_contact_rel: "Esposa", emergency_contact_phone: "462-204-8821", status: "ADMITTED", admission_date: iso(42), planned_discharge_date: day(12), alert_flag: false, alert_summary: null, updated_at: iso(1) },
    ],
    admissions: {
      1: { admission_type: "VOLUNTARIO", referral_source: "Solicitud familiar directa", admission_reason: "Acompañamiento integral de rehabilitación residencial.", guardian_name: "María Guadalupe López", guardian_id_number: "INE-99104281", guardian_relationship: "Madre", consent_accepted: true, consent_version: "v1.0-2026", consent_signer_name: "María Guadalupe López", consent_signer_role: "FAMILIAR_RESPONSABLE", consent_signature_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", consent_signed_at: iso(18), belongings_inventory_json: [{ item: "Teléfono celular", quantity: 1, condition: "Bueno (en resguardo)", notes: "Apagado con funda" }, { item: "Credencial INE", quantity: 1, condition: "Bueno", notes: "En expediente" }], belongings_notes: "Resguardo verificado ante familiar responsable.", signatures_json: null },
    },
    medical: {
      1: { blood_type: "O+", allergies: "Negadas", pathological_history: "Gastritis leve en remisión.", substance_use_history: "Inicio consumo de alcohol a los 17 años.", primary_substance: "Alcohol / Estimulantes", years_of_use: 6, physical_exam_summary: "Consciente, orientado, buena hidratación.", detox_protocol: "Fase estabilización: hidratación oral, complejo B y vigilancia de sueño.", prescriptions_json: [{ medication: "Complejo B + Tiamina", dose: "100 mg", frequency: "Cada 24 horas", route: "Oral", status: "ACTIVO" }], medical_alerts: "Monitorear sueño y TA nocturna.", signatures_json: null },
    },
    vitals: {
      1: [
        { id: 1, bp_systolic: 122, bp_diastolic: 80, heart_rate: 76, respiratory_rate: 17, temperature_c: 36.5, spo2_percent: 98, glucose_mg_dl: 94, observations: "Signos estables en pase de visita matutino.", recorded_at: iso(0.25) },
      ],
    },
    psychology: {
      1: { anamnesis: "Ansiedad situacional moderada con buena respuesta terapéutica.", life_history: "Red familiar receptiva.", mental_status_exam: "Lenguaje coherente, afecto eutímico con rasgos ansiosos leves.", psychometric_tests_json: [{ test: "Inventario de Ansiedad de Beck (BAI)", date: day(-14), score: "16 pts", interpretation: "Ansiedad leve" }], cie11_code: "6C40.2", dsm5_code: "F10.20", diagnosis_description: "Trastorno por consumo en remisión temprana; ansiedad situacional leve.", risk_level: "BAJO", treatment_plan: "Psicoterapia cognitivo-conductual semanal y sesión familiar.", signatures_json: null },
    },
    counseling: {
      1: { current_step: 4, steps_progress_json: defaultTwelveSteps(4), mentor_name: "Consejería Institucional", counselor_notes: "Participación constante en juntas diarias.", sessions_log_json: [{ session_date: day(-3), session_type: "INDIVIDUAL", step_focus: 4, summary: "Revisión guiada de inventario personal con apertura.", agreements: "Redactar aprendizajes de honestidad." }], signatures_json: null },
    },
    soap: [
      { id: 1, patient_id: 1, note_category: "EVOLUCION_CLINICA", subjective: "Paciente refiere mejoría en descanso nocturno y disposición al proceso terapéutico.", objective: "TA 122/80 mmHg, FC 76 lpm, SpO2 98%. Tranquilo, orientado y participativo.", assessment: "Evolución clínica favorable en fase de estabilización.", plan: "1. Continuar plan terapéutico multidisciplinario.\n2. Seguimiento en Psicología y Consejería.", ai_assisted: false, is_addendum: false, parent_note_id: null, author_name: "ÁNGELES DE ESPERANZA", author_role: "ADMIN", professional_license: "MASTER-ANGELES", digital_signature_hash: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4", signatures_json: null, signed_at: iso(0.2), created_at: iso(0.2) },
    ],
    discharges: {},
    socialWork: {
      1: { id: 1, patient_id: 1, socioeconomic_level: "Medio-bajo estable", housing_conditions: "Casa propia en Irapuato.", family_structure: "Núcleo unido con alta disposición para terapia familiar.", support_network_score: 8, family_visits_json: [], observations: "Red de apoyo sólida." },
    },
    labs: [
      { id: 1, patient_id: 1, test_type: "Panel Toxicológico Antidoping (6 parámetros)", performed_at: iso(4), result_summary: "NEGATIVO en los 6 parámetros evaluados", substances_json: {}, notes: "Control rutinario." },
    ],
    followups: [
      { id: 1, patient_id: 2, milestone_months: 1, scheduled_date: day(42), contact_channel: "LLAMADA", status: "PROGRAMADO", abstinence_status: null, notes: "Primer seguimiento post-egreso." },
    ],
    auditLogs: [
      { id: 1, user_id: 1, role: "ADMIN", action: "SYSTEM_BOOTSTRAP", table_name: "institutions", record_id: "1", details: "Inicialización del sistema ÁNGELES — Ángeles de Esperanza A.C.", ip_address: "local-pwa", created_at: iso(0.5) },
    ],
  };
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  const fresh = createSeedDB();
  saveDB(fresh);
  return fresh;
}

function saveDB(db) {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  } catch {
    throw new Error("Espacio local lleno en el navegador. Reduce el tamaño de los archivos adjuntos (máx. 1.5 MB por documento).");
  }
}

function sanitizeUser(u) {
  const { _pw, ...clean } = u;
  return clean;
}

function getAuthUser(db, token) {
  if (!token || !token.startsWith("local-jwt-")) return null;
  const id = Number(token.replace("local-jwt-", ""));
  return db.users.find((u) => u.id === id && u.is_active && u.approval_status === "APPROVED") || null;
}

function checkPerm(user, moduleName, required = "read") {
  if (!user) throw new Error("Autenticación requerida. Inicia sesión para continuar.");
  const perms = RBAC_MATRIX[user.role_code] || {};
  if ((ACCESS_RANK[perms[moduleName] || "none"] || 0) < (ACCESS_RANK[required] || 1)) {
    throw new Error(`Acceso denegado (RBAC): el rol '${user.role_code}' no tiene permiso de '${required}' en '${moduleName}'.`);
  }
}

function pushAudit(db, user, action, tableName, recordId, details) {
  db.auditLogs.unshift({
    id: db.nextIds.audit++,
    user_id: user ? user.id : null,
    role: user ? user.role_code : "APPLICANT",
    action,
    table_name: tableName,
    record_id: String(recordId ?? ""),
    details,
    ip_address: "browser-pwa",
    created_at: new Date().toISOString(),
  });
}

function parseSoapHeuristic(rawText) {
  const sentences = rawText.trim().split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const s = [], o = [], a = [], p = [];
  for (const sent of sentences) {
    const l = sent.toLowerCase();
    if (/(recomiendo|mantener|ajustar|programar|iniciar|sesión|dosis|valproato|seguimiento|plan)/.test(l)) p.push(sent);
    else if (/(presión|ta |fc |fr |temp|spo2|glucosa|signos|observa|mmhg|lpm|tranquilo|orientado)/.test(l)) o.push(sent);
    else if (/(evolución|diagnóstico|estable|riesgo|impresión|cuadro|mejora|progreso)/.test(l)) a.push(sent);
    else s.push(sent);
  }
  return {
    subjective: s.join(" ") || `El paciente refiere: ${rawText}`,
    objective: o.join(" ") || "Signos vitales y conducta observable pendientes de confirmar.",
    assessment: a.join(" ") || "Evolución clínica en valoración; correlacionar con expediente.",
    plan: p.length ? p.map((x, i) => `${i + 1}. ${x}`).join("\n") : "1. Continuar plan terapéutico multidisciplinario.\n2. Reevaluar en siguiente turno.",
  };
}

export async function handleLocalApi(path, options = {}, token = null) {
  const db = loadDB();
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const [pathname, queryStr = ""] = path.split("?");
  const params = new URLSearchParams(queryStr);
  const user = getAuthUser(db, token);

  // REGISTRO PÚBLICO DE PROFESIONALES (PENDIENTE DE AUTORIZACIÓN)
  if (pathname === "/api/v1/auth/register-professional" && method === "POST") {
    const roleCode = String(body.role_code || "").toUpperCase();
    if (!REGISTERABLE_ROLES.has(roleCode)) {
      throw new Error("Perfil profesional no válido.");
    }
    const uname = String(body.username || "").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    if (db.users.some((u) => u.username.toLowerCase() === uname || u.email.toLowerCase() === email)) {
      throw new Error("El nombre de usuario o correo electrónico ya está registrado.");
    }
    const newProf = {
      id: db.nextIds.user++,
      institution_id: 1,
      institution_name: "Ángeles de Esperanza A.C.",
      username: uname,
      email,
      full_name: String(body.full_name || "").trim(),
      role_code: roleCode,
      role_name: ROLE_NAMES[roleCode] || roleCode,
      professional_license: String(body.professional_license || "").trim(),
      specialty: body.specialty || ROLE_NAMES[roleCode],
      curp: body.curp ? String(body.curp).toUpperCase() : null,
      rfc: body.rfc ? String(body.rfc).toUpperCase() : null,
      birth_date: body.birth_date || null,
      phone: body.phone || null,
      address: body.address || null,
      university: body.university || null,
      graduation_year: body.graduation_year || null,
      experience_years: body.experience_years || null,
      bio: body.bio || null,
      documents_json: Array.isArray(body.documents) ? body.documents : [],
      default_signature_data: body.default_signature_data || null,
      approval_status: "PENDING",
      rejection_reason: null,
      approved_at: null,
      is_active: false,
      created_at: new Date().toISOString(),
      last_login_at: null,
      _pw: body.password,
    };
    db.users.unshift(newProf);
    pushAudit(db, null, "PROFESSIONAL_REGISTER_SUBMITTED", "users", newProf.id, `Solicitud profesional: ${newProf.full_name} (${newProf.role_name}) — ${newProf.documents_json.length} doc(s)`);
    saveDB(db);
    return {
      status: "pending_approval",
      id: newProf.id,
      username: newProf.username,
      role_name: newProf.role_name,
      documents_count: newProf.documents_json.length,
      message: "Tu solicitud de registro y documentos fueron enviados. La administración de ÁNGELES DE ESPERANZA revisará y autorizará tu acceso.",
    };
  }

  // AUTH LOGIN
  if (pathname === "/api/v1/auth/login" && method === "POST") {
    const id = String(body.identifier || "").trim().toLowerCase();
    const found = db.users.find((u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id);
    if (!found || body.password !== found._pw) {
      pushAudit(db, null, "LOGIN_FAILED", "users", id, "Intento fallido de inicio de sesión");
      saveDB(db);
      throw new Error("Usuario o contraseña incorrectos.");
    }
    if (found.approval_status === "PENDING") {
      throw new Error("Tu registro profesional está pendiente de revisión y autorización por la administración (ÁNGELES DE ESPERANZA).");
    }
    if (found.approval_status === "REJECTED") {
      throw new Error(`Tu solicitud no fue autorizada.${found.rejection_reason ? ` Motivo: ${found.rejection_reason}` : ""}`);
    }
    if (!found.is_active) {
      throw new Error("Tu cuenta se encuentra desactivada.");
    }
    found.last_login_at = new Date().toISOString();
    pushAudit(db, found, "LOGIN_SUCCESS", "users", found.id, `Acceso autorizado para ${found.full_name}`);
    saveDB(db);
    return {
      access_token: `local-jwt-${found.id}`,
      token_type: "bearer",
      inactivity_timeout_minutes: 20,
      user: { ...sanitizeUser(found), permissions: RBAC_MATRIX[found.role_code] },
    };
  }

  if (pathname === "/api/v1/auth/me" && method === "GET") {
    if (!user) throw new Error("Sesión expirada.");
    return { ...sanitizeUser(user), permissions: RBAC_MATRIX[user.role_code] };
  }

  if (pathname === "/api/v1/auth/logout" && method === "POST") {
    if (user) {
      pushAudit(db, user, "LOGOUT", "users", user.id, "Cierre de sesión");
      saveDB(db);
    }
    return { status: "ok" };
  }

  // DASHBOARD
  if (pathname === "/api/v1/dashboard/summary" && method === "GET") {
    if (!user) throw new Error("Autenticación requerida.");
    const active = db.patients.filter((p) => p.status === "ADMITTED");
    const alerts = active.filter((p) => p.alert_flag);
    const pendingProfs = db.users.filter((u) => u.approval_status === "PENDING").length;
    return {
      metrics: {
        active_patients: active.length,
        admissions_this_month: db.patients.length,
        planned_discharges_30d: active.filter((p) => p.planned_discharge_date).length,
        pending_alerts: alerts.length,
        discharged_total: db.patients.filter((p) => p.status === "DISCHARGED").length,
        soap_notes_7d: db.soap.length,
        upcoming_followups: db.followups.filter((f) => f.status === "PROGRAMADO").length,
        pending_professionals: pendingProfs,
      },
      alerts: alerts.map((p) => ({ patient_id: p.id, folio: p.folio, full_name: `${p.first_name} ${p.last_name}`, summary: p.alert_summary, updated_at: p.updated_at })),
      active_patients: active.map((p) => ({ id: p.id, folio: p.folio, full_name: `${p.first_name} ${p.last_name}`, curp: p.curp, status: p.status, admission_date: p.admission_date, planned_discharge_date: p.planned_discharge_date, alert_flag: p.alert_flag, alert_summary: p.alert_summary })),
      recent_activity: db.auditLogs.slice(0, 10),
    };
  }

  // GLOBAL SEARCH
  if (pathname === "/api/v1/search" && method === "GET") {
    if (!user) throw new Error("Autenticación requerida.");
    const q = (params.get("q") || "").trim().toLowerCase();
    const perms = RBAC_MATRIX[user.role_code] || {};
    const patients = db.patients
      .filter((p) => `${p.folio} ${p.first_name} ${p.last_name} ${p.curp || ""} ${p.alert_summary || ""}`.toLowerCase().includes(q))
      .map((p) => ({ id: p.id, folio: p.folio, full_name: `${p.first_name} ${p.last_name}`, curp: p.curp, status: p.status, alert_flag: p.alert_flag, route: `/angeles/expedientes/${p.id}` }));
    const catalog = [
      { title: "Panel de Control", subtitle: "Indicadores y alertas", route: "/angeles/dashboard", module: "admission", kw: "dashboard panel metricas" },
      { title: "Expedientes Clínicos", subtitle: "Listado y alta de expedientes", route: "/angeles/expedientes", module: "admission", kw: "expedientes pacientes ingreso" },
      { title: "Módulos de Expansión", subtitle: "Trabajo Social, Laboratorio y Post-Egreso", route: "/angeles/modulos-expansion", module: "expansion", kw: "trabajo social laboratorio antidoping seguimiento" },
      { title: "Autorización de Profesionales y Auditoría", subtitle: "Solicitudes pendientes, usuarios, RBAC y audit_logs", route: "/angeles/administracion", module: "admin", kw: "administracion autorizar profesionales usuarios roles rbac auditoria" },
    ];
    const sections = catalog.filter((c) => perms[c.module] !== "none" && `${c.title} ${c.subtitle} ${c.kw}`.toLowerCase().includes(q));
    return { query: q, patients, sections };
  }

  // PATIENTS
  if (pathname === "/api/v1/patients" && method === "GET") {
    checkPerm(user, "admission", "read");
    const q = (params.get("q") || "").trim().toLowerCase();
    const st = params.get("status") || "";
    return db.patients.filter((p) => {
      if (st && p.status !== st) return false;
      if (q && !`${p.folio} ${p.first_name} ${p.last_name} ${p.curp || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  if (pathname === "/api/v1/patients" && method === "POST") {
    checkPerm(user, "admission", "write");
    const id = db.nextIds.patient++;
    const folio = `ANG-${new Date().getFullYear()}-${String(id).padStart(3, "0")}`;
    const p = { id, institution_id: 1, folio, status: "ADMITTED", admission_date: new Date().toISOString(), updated_at: new Date().toISOString(), alert_flag: Boolean(body.alert_flag), ...body };
    db.patients.unshift(p);
    db.admissions[id] = { admission_type: "VOLUNTARIO", belongings_inventory_json: [], signatures_json: null };
    db.medical[id] = { prescriptions_json: [], signatures_json: null };
    db.psychology[id] = { risk_level: "BAJO", psychometric_tests_json: [], signatures_json: null };
    db.counseling[id] = { current_step: 1, steps_progress_json: defaultTwelveSteps(1), sessions_log_json: [], signatures_json: null };
    pushAudit(db, user, "CREATE_PATIENT", "patients", folio, `Nuevo expediente ${folio}`);
    saveDB(db);
    return p;
  }

  // FULL CHART
  let m = pathname.match(/^\/api\/v1\/patients\/(\d+)\/full-chart$/);
  if (m && method === "GET") {
    if (!user) throw new Error("Autenticación requerida.");
    const pid = Number(m[1]);
    const patient = db.patients.find((p) => p.id === pid);
    if (!patient) throw new Error("Expediente clínico no encontrado.");
    const perms = RBAC_MATRIX[user.role_code];
    const allow = (mod) => (ACCESS_RANK[perms[mod] || "none"] || 0) >= 1;
    pushAudit(db, user, "VIEW_FULL_CHART", "patients", patient.folio, `Consulta integral ${patient.folio}`);
    saveDB(db);
    return {
      patient,
      permissions: perms,
      modules: {
        admission: { access: perms.admission, data: allow("admission") ? (db.admissions[pid] || {}) : null },
        medical: { access: perms.medical, data: allow("medical") ? (db.medical[pid] || {}) : null, vital_signs: allow("medical") ? (db.vitals[pid] || []) : [] },
        psychology: { access: perms.psychology, data: allow("psychology") ? (db.psychology[pid] || {}) : null },
        counseling: { access: perms.counseling, data: allow("counseling") ? (db.counseling[pid] || { current_step: 1, steps_progress_json: defaultTwelveSteps(1), sessions_log_json: [] }) : null },
        soap: { access: perms.soap, notes: allow("soap") ? db.soap.filter((n) => n.patient_id === pid) : [] },
        discharge: { access: perms.discharge, data: allow("discharge") ? (db.discharges[pid] || {}) : null },
        expansion: { access: perms.expansion, social_work: allow("expansion") ? (db.socialWork[pid] || null) : null, lab_screenings: allow("expansion") ? db.labs.filter((l) => l.patient_id === pid) : [], followups: allow("expansion") ? db.followups.filter((f) => f.patient_id === pid) : [] },
      },
    };
  }

  // CLINICAL MODULES 1..6 & EXPANSION
  m = pathname.match(/^\/api\/v1\/patients\/(\d+)\/(admission|medical|vitals|psychology|counseling|counseling\/sessions|discharge|social-work|lab-screenings|followups)$/);
  if (m) {
    const pid = Number(m[1]);
    const sub = m[2];
    const patient = db.patients.find((p) => p.id === pid);
    if (!patient) throw new Error("Expediente no encontrado.");

    if (sub === "admission" && method === "PUT") {
      checkPerm(user, "admission", "write");
      const updated = { ...(db.admissions[pid] || {}), ...body };
      if (body.consent_signature_data || body.signatures_json) {
        updated.consent_signed_at = new Date().toISOString();
        updated.consent_signature_hash = await sha256Hex({ folio: patient.folio, signer: body.consent_signer_name, at: updated.consent_signed_at });
      }
      db.admissions[pid] = updated;
      pushAudit(db, user, "UPDATE_ADMISSION_CONSENT", "admissions", patient.folio, `Módulo 1 firmado y guardado — ${patient.folio}`);
      saveDB(db);
      return { status: "saved", consent_signature_hash: updated.consent_signature_hash };
    }
    if (sub === "medical" && method === "PUT") {
      checkPerm(user, "medical", "write");
      db.medical[pid] = { ...(db.medical[pid] || {}), ...body };
      pushAudit(db, user, "UPDATE_MEDICAL_RECORD", "medical_records", patient.folio, `Área médica actualizada — ${patient.folio}`);
      saveDB(db);
      return { status: "saved" };
    }
    if (sub === "vitals" && method === "POST") {
      checkPerm(user, "medical", "write");
      const entry = { id: db.nextIds.vital++, ...body, recorded_at: new Date().toISOString() };
      db.vitals[pid] = [entry, ...(db.vitals[pid] || [])];
      pushAudit(db, user, "CREATE_VITAL_SIGNS", "vital_signs", entry.id, `Signos vitales ${patient.folio}`);
      saveDB(db);
      return { status: "created", id: entry.id };
    }
    if (sub === "psychology" && method === "PUT") {
      checkPerm(user, "psychology", "write");
      db.psychology[pid] = { ...(db.psychology[pid] || {}), ...body };
      pushAudit(db, user, "UPDATE_PSYCHOLOGY_RECORD", "psychological_records", patient.folio, `Psicología actualizada — ${patient.folio}`);
      saveDB(db);
      return { status: "saved" };
    }
    if (sub === "counseling" && method === "PUT") {
      checkPerm(user, "counseling", "write");
      db.counseling[pid] = { ...(db.counseling[pid] || { sessions_log_json: [] }), ...body };
      pushAudit(db, user, "UPDATE_COUNSELING_12STEPS", "counseling_records", patient.folio, `Paso ${body.current_step} — ${patient.folio}`);
      saveDB(db);
      return { status: "saved" };
    }
    if (sub === "counseling/sessions" && method === "POST") {
      checkPerm(user, "counseling", "write");
      const cur = db.counseling[pid] || { current_step: 1, steps_progress_json: defaultTwelveSteps(1), sessions_log_json: [] };
      cur.sessions_log_json = [{ ...body, recorded_by: user.full_name }, ...(cur.sessions_log_json || [])];
      db.counseling[pid] = cur;
      pushAudit(db, user, "CREATE_COUNSELING_SESSION", "counseling_records", patient.folio, `Sesión ${body.session_type}`);
      saveDB(db);
      return { status: "created" };
    }
    if (sub === "discharge" && method === "PUT") {
      checkPerm(user, "discharge", "write");
      const sig = await sha256Hex({ folio: patient.folio, type: body.discharge_type, at: new Date().toISOString() });
      db.discharges[pid] = { ...(db.discharges[pid] || {}), ...body, discharge_date: new Date().toISOString(), digital_signature_hash: sig };
      if (body.finalize_discharge) patient.status = body.discharge_type === "TRANSFER" ? "TRANSFERRED" : "DISCHARGED";
      pushAudit(db, user, "UPDATE_DISCHARGE_RECORD", "discharges", patient.folio, `Egreso ${body.discharge_type}`);
      saveDB(db);
      return { status: "saved", digital_signature_hash: sig };
    }
    if (sub === "social-work" && method === "PUT") {
      checkPerm(user, "expansion", "write");
      db.socialWork[pid] = { id: pid, patient_id: pid, ...(db.socialWork[pid] || {}), ...body };
      pushAudit(db, user, "UPDATE_SOCIAL_WORK", "social_work_records", patient.folio, `Trabajo social actualizado`);
      saveDB(db);
      return { status: "saved" };
    }
    if (sub === "lab-screenings" && method === "POST") {
      checkPerm(user, "expansion", "write");
      const entry = { id: db.nextIds.lab++, patient_id: pid, performed_at: new Date().toISOString(), ...body };
      db.labs.unshift(entry);
      pushAudit(db, user, "CREATE_LAB_SCREENING", "lab_screenings", entry.id, `${body.test_type} — ${patient.folio}`);
      saveDB(db);
      return { status: "created", id: entry.id };
    }
    if (sub === "followups" && method === "POST") {
      checkPerm(user, "expansion", "write");
      const entry = { id: db.nextIds.followup++, patient_id: pid, status: "PROGRAMADO", ...body };
      db.followups.push(entry);
      pushAudit(db, user, "CREATE_FOLLOWUP", "post_discharge_followups", entry.id, `Seguimiento ${body.milestone_months}m`);
      saveDB(db);
      return { status: "created", id: entry.id };
    }
  }

  // AI SOAP & NOTES
  if (pathname === "/api/v1/ai/assist-soap" && method === "POST") {
    checkPerm(user, "soap", "write");
    pushAudit(db, user, "AI_SOAP_DRAFT_GENERATED", "soap_notes", body.patient_id || "draft", "Borrador SOAP estructurado");
    saveDB(db);
    return {
      status: "success",
      ai_provider: "clinical-structured-pwa",
      requires_clinician_review: true,
      safety_notice: "BORRADOR ASISTIDO POR IA: Esta propuesta NO se guarda automáticamente ni sustituye el criterio clínico. Revisa y firma con SHA-256.",
      suggested_soap: parseSoapHeuristic(body.raw_clinician_dictation || ""),
    };
  }

  if (pathname === "/api/v1/clinical/soap-notes" && method === "POST") {
    checkPerm(user, "soap", "write");
    const signedAt = new Date().toISOString();
    const hash = await sha256Hex({ ...body, author: user.full_name, license: user.professional_license, signedAt });
    const note = { id: db.nextIds.soap++, ...body, is_addendum: false, parent_note_id: null, author_name: user.full_name, author_role: user.role_code, professional_license: user.professional_license, digital_signature_hash: hash, signed_at: signedAt, created_at: signedAt };
    db.soap.unshift(note);
    pushAudit(db, user, "SIGN_SOAP_NOTE", "soap_notes", note.id, `Nota SOAP firmada (${hash.slice(0, 12)}...)`);
    saveDB(db);
    return { status: "signed", id: note.id, digital_signature_hash: hash, signed_at: signedAt };
  }

  m = pathname.match(/^\/api\/v1\/clinical\/soap-notes\/(\d+)\/addendum$/);
  if (m && method === "POST") {
    checkPerm(user, "soap", "write");
    const parent = db.soap.find((n) => n.id === Number(m[1]));
    if (!parent) throw new Error("Nota SOAP original no encontrada.");
    const signedAt = new Date().toISOString();
    const hash = await sha256Hex({ parent: parent.id, ...body, author: user.full_name, signedAt });
    const add = { id: db.nextIds.soap++, patient_id: parent.patient_id, note_category: "NOTA_ACLARATORIA_ADENDA", ...body, ai_assisted: false, is_addendum: true, parent_note_id: parent.id, author_name: user.full_name, author_role: user.role_code, professional_license: user.professional_license, digital_signature_hash: hash, signed_at: signedAt, created_at: signedAt };
    db.soap.unshift(add);
    pushAudit(db, user, "SIGN_SOAP_ADDENDUM", "soap_notes", add.id, `Adenda vinculada a nota #${parent.id}`);
    saveDB(db);
    return { status: "signed_addendum", id: add.id, digital_signature_hash: hash };
  }

  // EXPANSION
  if (pathname === "/api/v1/expansion/overview" && method === "GET") {
    checkPerm(user, "expansion", "read");
    const pById = Object.fromEntries(db.patients.map((p) => [p.id, p]));
    const attach = (pid) => ({ patient_folio: pById[pid]?.folio || "", patient_name: pById[pid] ? `${pById[pid].first_name} ${pById[pid].last_name}` : "" });
    return {
      social_work: Object.values(db.socialWork).map((s) => ({ ...s, ...attach(s.patient_id) })),
      lab_screenings: db.labs.map((l) => ({ ...l, ...attach(l.patient_id) })),
      followups: db.followups.map((f) => ({ ...f, ...attach(f.patient_id) })),
    };
  }

  m = pathname.match(/^\/api\/v1\/followups\/(\d+)$/);
  if (m && method === "PATCH") {
    checkPerm(user, "expansion", "write");
    const f = db.followups.find((x) => x.id === Number(m[1]));
    if (!f) throw new Error("Seguimiento no encontrado.");
    Object.assign(f, body);
    pushAudit(db, user, "UPDATE_FOLLOWUP", "post_discharge_followups", f.id, `Estado=${f.status}`);
    saveDB(db);
    return { status: "updated", id: f.id };
  }

  // ADMIN MASTER + AUTORIZACIÓN DE PROFESIONALES
  if (pathname === "/api/v1/admin/users" && method === "GET") {
    checkPerm(user, "admin", "full");
    const list = db.users.map(sanitizeUser);
    const pending = list.filter((u) => u.approval_status === "PENDING");
    return { users: list, pending_professionals: pending, pending_count: pending.length, rbac_matrix: RBAC_MATRIX };
  }

  if (pathname === "/api/v1/admin/professionals" && method === "GET") {
    checkPerm(user, "admin", "full");
    const st = (params.get("approval_status") || "").toUpperCase();
    let list = db.users.filter((u) => u.username !== "abun").map(sanitizeUser);
    if (st && ["PENDING", "APPROVED", "REJECTED"].includes(st)) {
      list = list.filter((u) => u.approval_status === st);
    }
    return {
      count: list.length,
      pending_count: db.users.filter((u) => u.approval_status === "PENDING").length,
      professionals: list,
    };
  }

  m = pathname.match(/^\/api\/v1\/admin\/professionals\/(\d+)\/(approve|reject)$/);
  if (m && method === "POST") {
    checkPerm(user, "admin", "full");
    const target = db.users.find((u) => u.id === Number(m[1]));
    if (!target) throw new Error("Solicitud profesional no encontrada.");
    if (m[2] === "approve") {
      target.approval_status = "APPROVED";
      target.is_active = true;
      target.rejection_reason = null;
      target.approved_at = new Date().toISOString();
      pushAudit(db, user, "APPROVE_PROFESSIONAL", "users", target.id, `Registro AUTORIZADO: ${target.full_name} (${target.role_name})`);
      saveDB(db);
      return { status: "approved", id: target.id, full_name: target.full_name };
    } else {
      target.approval_status = "REJECTED";
      target.is_active = false;
      target.rejection_reason = body.reason || "Documentación pendiente o no validada.";
      pushAudit(db, user, "REJECT_PROFESSIONAL", "users", target.id, `Registro RECHAZADO: ${target.full_name}`);
      saveDB(db);
      return { status: "rejected", id: target.id };
    }
  }

  if (pathname === "/api/v1/admin/users" && method === "POST") {
    checkPerm(user, "admin", "full");
    const roleCode = String(body.role_code || "DOCTOR").toUpperCase();
    const nu = { id: db.nextIds.user++, institution_id: 1, institution_name: "Ángeles de Esperanza A.C.", username: body.username.toLowerCase(), email: body.email.toLowerCase(), full_name: body.full_name, role_code: roleCode, role_name: ROLE_NAMES[roleCode] || roleCode, professional_license: body.professional_license, specialty: body.specialty, approval_status: "APPROVED", approved_at: new Date().toISOString(), documents_json: [], is_active: true, created_at: new Date().toISOString(), last_login_at: null, _pw: body.password };
    db.users.unshift(nu);
    pushAudit(db, user, "ADMIN_CREATE_USER", "users", nu.id, `Usuario creado: ${nu.username}`);
    saveDB(db);
    return { status: "created", id: nu.id };
  }

  if (pathname === "/api/v1/admin/audit-logs" && method === "GET") {
    checkPerm(user, "admin", "full");
    return { count: db.auditLogs.length, immutable: true, logs: db.auditLogs.slice(0, 100) };
  }

  throw new Error(`Endpoint no disponible: ${method} ${pathname}`);
}
