/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import {
  apiRequest,
  closeModal,
  esc,
  formatDateOnly,
  formatDateTime,
  openModal,
  showToast,
} from "../api.js";
import { accessLabel, statusBadge } from "../rbac.js";
import { mountFormatSignatureBlock } from "../signature-block.js";
import { CapacitiveSignaturePad } from "../signature-pad.js";

const MODULE_TABS = [
  { key: "admission", label: "1. Admisión e Ingreso" },
  { key: "medical", label: "2. Área Médica" },
  { key: "psychology", label: "3. Psicología / Psiquiatría" },
  { key: "counseling", label: "4. Consejería (12 Pasos)" },
  { key: "soap", label: "5. Notas SOAP + IA" },
  { key: "discharge", label: "6. Egreso / Alta" },
];

export async function renderPatientChartView(container, patientId, initialTab = null) {
  container.innerHTML = `<div class="card"><p class="muted-sm">Cargando expediente clínico integral...</p></div>`;

  let chart;
  try {
    chart = await apiRequest(`/api/v1/patients/${patientId}/full-chart`);
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--danger-600);">${esc(err.message)}</p><a href="/angeles/expedientes" class="btn btn-secondary" data-link>← Volver a Expedientes</a></div>`;
    return;
  }

  const p = chart.patient;
  const perms = chart.permissions;
  const firstAllowed = MODULE_TABS.find((t) => perms[t.key] && perms[t.key] !== "none")?.key || "admission";
  let activeTab = initialTab && perms[initialTab] && perms[initialTab] !== "none" ? initialTab : firstAllowed;

  function renderShell() {
    container.innerHTML = `
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header" style="margin-bottom:10px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
              <span class="mono badge badge-blue" style="font-size:0.86rem;">${esc(p.folio)}</span>
              ${statusBadge(p.status)}
              ${p.alert_flag ? `<span class="badge badge-gold">Alerta: ${esc(p.alert_summary || "Atención prioritaria")}</span>` : ""}
            </div>
            <h1 style="font-size:1.55rem;margin:6px 0 4px;color:var(--blue-950);">${esc(p.first_name)} ${esc(p.last_name)}</h1>
            <p class="muted-sm">
              CURP: <span class="mono">${esc(p.curp || "No registrada")}</span> ·
              Ingreso: ${formatDateOnly(p.admission_date)} ·
              Egreso est.: ${formatDateOnly(p.planned_discharge_date)} ·
              Contacto: ${esc(p.emergency_contact_name || "—")} (${esc(p.emergency_contact_phone || "—")})
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.print()">Imprimir Vista</button>
            <a href="/angeles/expedientes" class="btn btn-ghost btn-sm" data-link>← Expedientes</a>
          </div>
        </div>

        <nav class="module-tabs" role="tablist" aria-label="Módulos del Expediente Clínico">
          ${MODULE_TABS.map((t) => {
            const level = perms[t.key] || "none";
            const locked = level === "none";
            return `
              <button
                type="button"
                role="tab"
                class="module-tab ${activeTab === t.key ? "active" : ""} ${locked ? "locked" : ""}"
                data-tab="${t.key}"
                ${locked ? 'disabled title="Sin permiso para este rol (RBAC)"' : ""}
              >
                ${esc(t.label)}
                ${locked ? " 🔒" : ""}
              </button>`;
          }).join("")}
        </nav>

        <div id="chart-module-content"></div>
      </div>
    `;

    container.querySelectorAll(".module-tab:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.getAttribute("data-tab");
        renderShell();
      });
    });

    const body = document.getElementById("chart-module-content");
    const reloadChart = () => renderPatientChartView(container, patientId, activeTab);

    if (activeTab === "admission") renderModule1Admission(body, chart, reloadChart);
    else if (activeTab === "medical") renderModule2Medical(body, chart, reloadChart);
    else if (activeTab === "psychology") renderModule3Psychology(body, chart, reloadChart);
    else if (activeTab === "counseling") renderModule4Counseling(body, chart, reloadChart);
    else if (activeTab === "soap") renderModule5Soap(body, chart, reloadChart);
    else if (activeTab === "discharge") renderModule6Discharge(body, chart, reloadChart);
  }

  renderShell();
}

/* ============================================================================
 * MÓDULO 1: ADMISIÓN, CONSENTIMIENTO CAPACITIVO E INVENTARIO
 * ========================================================================== */
function renderModule1Admission(el, chart, reload) {
  const access = chart.modules.admission.access;
  const canWrite = access === "write" || access === "full";
  const adm = chart.modules.admission.data || {};
  let belongings = Array.isArray(adm.belongings_inventory_json) ? [...adm.belongings_inventory_json] : [];

  el.innerHTML = `
    <div class="card-header">
      <div>
        <h2 class="card-title">Módulo 1: Admisión, Consentimiento Informado e Inventario</h2>
        <p class="muted-sm">Permiso actual: <strong>${accessLabel(access)}</strong></p>
      </div>
      ${adm.consent_signature_hash ? `<span class="badge badge-green">Consentimiento Firmado · SHA-256</span>` : `<span class="badge badge-gold">Consentimiento pendiente de firma</span>`}
    </div>

    <form id="mod1-form">
      <div class="form-grid">
        <div class="form-field">
          <label>Modalidad de Ingreso</label>
          <select name="admission_type" ${canWrite ? "" : "disabled"}>
            <option value="VOLUNTARIO" ${adm.admission_type === "VOLUNTARIO" ? "selected" : ""}>Voluntario</option>
            <option value="INVOLUNTARIO_FAMILIAR" ${adm.admission_type === "INVOLUNTARIO_FAMILIAR" ? "selected" : ""}>A solicitud de familiar responsable</option>
            <option value="REFERIDO" ${adm.admission_type === "REFERIDO" ? "selected" : ""}>Referencia médica / institucional</option>
          </select>
        </div>
        <div class="form-field">
          <label>Fuente de referencia</label>
          <input type="text" name="referral_source" value="${esc(adm.referral_source || "")}" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field full">
          <label>Motivo principal de ingreso</label>
          <textarea name="admission_reason" ${canWrite ? "" : "disabled"}>${esc(adm.admission_reason || "")}</textarea>
        </div>
        <div class="form-field">
          <label>Familiar responsable / Tutor</label>
          <input type="text" name="guardian_name" value="${esc(adm.guardian_name || chart.patient.emergency_contact_name || "")}" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field">
          <label>Parentesco</label>
          <input type="text" name="guardian_relationship" value="${esc(adm.guardian_relationship || chart.patient.emergency_contact_rel || "")}" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field">
          <label>Identificación oficial (INE / Pasaporte)</label>
          <input type="text" name="guardian_id_number" value="${esc(adm.guardian_id_number || "")}" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field">
          <label>Nombre de quien firma el Consentimiento</label>
          <input type="text" name="consent_signer_name" value="${esc(adm.consent_signer_name || "")}" ${canWrite ? "" : "disabled"} placeholder="Nombre completo del firmante" />
        </div>
      </div>

      <!-- Consentimiento Informado + Pad de Firma Capacitiva -->
      <div class="card" style="margin-top:18px;background:var(--blue-50);border-color:#CBE0F2;">
        <h3 class="card-title" style="margin-bottom:8px;">Consentimiento Informado Institucional (v1.0-2026)</h3>
        <p style="font-size:0.86rem;color:var(--text-secondary);margin-top:0;">
          Manifiesto libremente mi conformidad para el ingreso y acompañamiento multidisciplinario (médico, psicológico, consejería de 12 Pasos y trabajo social) en el <strong>Centro de Rehabilitación en Adicciones Ángeles de Esperanza A.C.</strong> (Irapuato, Guanajuato), bajo apego a derechos humanos, confidencialidad clínica y reglamento interno vigente.
        </p>

        <div class="form-grid" style="margin-bottom:12px;">
          <div class="form-field">
            <label>Calidad del firmante</label>
            <select name="consent_signer_role" ${canWrite ? "" : "disabled"}>
              <option value="PACIENTE" ${adm.consent_signer_role === "PACIENTE" ? "selected" : ""}>Paciente</option>
              <option value="FAMILIAR_RESPONSABLE" ${adm.consent_signer_role === "FAMILIAR_RESPONSABLE" ? "selected" : ""}>Familiar Responsable / Tutor</option>
            </select>
          </div>
          <div class="form-field" style="justify-content:end;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" name="consent_accepted" style="width:20px;height:20px;min-height:auto;" ${adm.consent_accepted ? "checked" : ""} ${canWrite ? "" : "disabled"} />
              Acepto los términos del Consentimiento Informado
            </label>
          </div>
        </div>

        ${
          adm.consent_signature_data
            ? `<div style="margin-bottom:12px;background:#fff;padding:12px;border-radius:10px;border:1px solid var(--border-light);">
                <div class="muted-sm" style="margin-bottom:6px;">Firma registrada (${formatDateTime(adm.consent_signed_at)}):</div>
                <img src="${adm.consent_signature_data}" alt="Firma digital registrada" style="max-height:110px;border:1px solid var(--border-light);border-radius:8px;" />
              </div>`
            : ""
        }

        ${
          adm.consent_signature_hash
            ? `<div class="muted-sm mono" style="margin-bottom:12px;word-break:break-all;">SHA-256 Integridad: ${esc(adm.consent_signature_hash)}</div>`
            : ""
        }

        ${
          canWrite
            ? `<div class="signature-box">
                <div class="muted-sm" style="margin-bottom:6px;">Firme con el dedo, stylus o mouse dentro del recuadro:</div>
                <canvas id="consent-signature-canvas" class="signature-canvas"></canvas>
                <div class="signature-toolbar">
                  <span class="muted-sm">Pad táctil capacitivo HTML5 — genera marca de tiempo y SHA-256 al guardar.</span>
                  <button type="button" id="btn-clear-sig" class="btn btn-secondary btn-sm">Limpiar Firma</button>
                </div>
              </div>`
            : ""
        }
      </div>

      <!-- Inventario de Pertenencias -->
      <div class="card" style="margin-top:18px;">
        <div class="card-header">
          <h3 class="card-title">Inventario de Pertenencias en Resguardo</h3>
          ${canWrite ? `<button type="button" id="btn-add-belonging" class="btn btn-secondary btn-sm">+ Agregar Objeto</button>` : ""}
        </div>
        <div id="belongings-list"></div>
        <div class="form-field" style="margin-top:12px;">
          <label>Observaciones de resguardo</label>
          <input type="text" name="belongings_notes" value="${esc(adm.belongings_notes || "")}" ${canWrite ? "" : "disabled"} />
        </div>
      </div>

      <div id="sig-block-mod1"></div>

      ${
        canWrite
          ? `<div style="display:flex;justify-content:flex-end;margin-top:18px;">
              <button type="submit" class="btn btn-primary">Guardar Admisión, Firmas e Inventario</button>
            </div>`
          : ""
      }
    </form>
  `;

  let sigPad = null;
  if (canWrite) {
    const canvas = document.getElementById("consent-signature-canvas");
    if (canvas) {
      sigPad = new CapacitiveSignaturePad(canvas);
      document.getElementById("btn-clear-sig")?.addEventListener("click", () => sigPad.clear());
    }
  }

  const listEl = document.getElementById("belongings-list");
  function renderBelongings() {
    if (!belongings.length) {
      listEl.innerHTML = `<p class="muted-sm">No hay objetos registrados en resguardo.</p>`;
      return;
    }
    listEl.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Objeto</th><th>Cant.</th><th>Estado</th><th>Observaciones</th>${canWrite ? "<th></th>" : ""}</tr></thead>
          <tbody>
            ${belongings
              .map(
                (b, idx) => `
              <tr>
                <td><strong>${esc(b.item)}</strong></td>
                <td>${esc(b.quantity || 1)}</td>
                <td><span class="badge badge-gray">${esc(b.condition || "Bueno")}</span></td>
                <td class="muted-sm">${esc(b.notes || "—")}</td>
                ${canWrite ? `<td><button type="button" class="btn btn-ghost btn-sm" data-rm-bel="${idx}">Quitar</button></td>` : ""}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    listEl.querySelectorAll("[data-rm-bel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        belongings.splice(Number(btn.getAttribute("data-rm-bel")), 1);
        renderBelongings();
      });
    });
  }
  renderBelongings();

  document.getElementById("btn-add-belonging")?.addEventListener("click", () => {
    openModal(
      "Agregar Pertenencia al Inventario",
      `
      <form id="modal-bel-form" class="form-grid" style="grid-template-columns:1fr;">
        <div class="form-field"><label>Artículo / Objeto *</label><input name="item" required placeholder="Ej. Teléfono celular, reloj, credencial..." /></div>
        <div class="form-field"><label>Cantidad</label><input type="number" name="quantity" value="1" min="1" /></div>
        <div class="form-field"><label>Estado físico</label><input name="condition" value="Bueno (en resguardo)" /></div>
        <div class="form-field"><label>Observaciones</label><input name="notes" placeholder="Color, marca, detalles..." /></div>
        <button type="submit" class="btn btn-primary">Agregar al Inventario</button>
      </form>`
    );
    document.getElementById("modal-bel-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      belongings.push({
        item: fd.get("item"),
        quantity: Number(fd.get("quantity") || 1),
        condition: fd.get("condition"),
        notes: fd.get("notes"),
      });
      closeModal();
      renderBelongings();
    });
  });

  const sigMod1 = mountFormatSignatureBlock(document.getElementById("sig-block-mod1"), {
    prefix: "mod1",
    patient: chart.patient,
    existingSignatures: adm.signatures_json,
    canWrite,
    includeFamily: true,
    formatTitle: "Módulo 1 — Admisión, Consentimiento Informado e Inventario",
    getPrintRows: () => {
      const fd = new FormData(document.getElementById("mod1-form"));
      return [
        { label: "Modalidad de Ingreso", value: fd.get("admission_type") },
        { label: "Fuente de Referencia", value: fd.get("referral_source") },
        { label: "Motivo Principal de Ingreso", value: fd.get("admission_reason") },
        { label: "Familiar Responsable / Tutor", value: `${fd.get("guardian_name") || "—"} (${fd.get("guardian_relationship") || "—"}) · ID: ${fd.get("guardian_id_number") || "—"}` },
        { label: "Consentimiento Informado", value: fd.get("consent_accepted") === "on" ? `Aceptado por ${fd.get("consent_signer_name") || "—"} (${fd.get("consent_signer_role")})` : "Pendiente" },
        { label: "Inventario de Pertenencias", value: belongings.length ? belongings.map((b) => `• ${b.item} (x${b.quantity}) — ${b.condition}`).join("\n") : "Sin objetos registrados" },
      ];
    },
  });

  if (canWrite) {
    document.getElementById("mod1-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const signatures_json = await sigMod1.collectSignatures();
      const payload = {
        admission_type: fd.get("admission_type"),
        referral_source: fd.get("referral_source") || null,
        admission_reason: fd.get("admission_reason") || null,
        guardian_name: fd.get("guardian_name") || null,
        guardian_id_number: fd.get("guardian_id_number") || null,
        guardian_relationship: fd.get("guardian_relationship") || null,
        consent_accepted: fd.get("consent_accepted") === "on",
        consent_signer_name: fd.get("consent_signer_name") || null,
        consent_signer_role: fd.get("consent_signer_role"),
        consent_signature_data: sigPad ? sigPad.toDataURL() : null,
        belongings_inventory_json: belongings,
        belongings_notes: fd.get("belongings_notes") || null,
        signatures_json,
      };
      try {
        await apiRequest(`/api/v1/patients/${chart.patient.id}/admission`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast("Módulo 1 guardado con firmas digitales y sello SHA-256.", "success");
        reload();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
}

/* ============================================================================
 * MÓDULO 2: ÁREA MÉDICA Y SIGNOS VITALES CONTINUOS
 * ========================================================================== */
function renderModule2Medical(el, chart, reload) {
  const access = chart.modules.medical.access;
  const canWrite = access === "write" || access === "full";
  const med = chart.modules.medical.data || {};
  const vitals = chart.modules.medical.vital_signs || [];
  let prescriptions = Array.isArray(med.prescriptions_json) ? [...med.prescriptions_json] : [];

  el.innerHTML = `
    <div class="card-header">
      <div>
        <h2 class="card-title">Módulo 2: Área Médica, Signos Vitales y Desintoxicación</h2>
        <p class="muted-sm">Permiso actual: <strong>${accessLabel(access)}</strong></p>
      </div>
      ${canWrite ? `<button type="button" id="btn-new-vitals" class="btn btn-primary btn-sm">+ Registrar Signos Vitales</button>` : ""}
    </div>

    <!-- Tabla de Signos Vitales -->
    <div class="card" style="margin-bottom:18px;">
      <h3 class="card-title" style="margin-bottom:10px;">Monitoreo Continuo de Signos Vitales</h3>
      ${
        vitals.length
          ? `<div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Fecha / Hora</th><th>TA (mmHg)</th><th>FC (lpm)</th><th>FR (rpm)</th><th>Temp (°C)</th><th>SpO2 (%)</th><th>Glucosa</th><th>Observaciones</th></tr></thead>
                <tbody>
                  ${vitals
                    .map(
                      (v) => `
                    <tr>
                      <td class="muted-sm">${formatDateTime(v.recorded_at)}</td>
                      <td class="mono"><strong>${v.bp_systolic ?? "—"}/${v.bp_diastolic ?? "—"}</strong></td>
                      <td class="mono">${v.heart_rate ?? "—"}</td>
                      <td class="mono">${v.respiratory_rate ?? "—"}</td>
                      <td class="mono">${v.temperature_c ?? "—"}</td>
                      <td class="mono">${v.spo2_percent ?? "—"}%</td>
                      <td class="mono">${v.glucose_mg_dl ?? "—"}</td>
                      <td class="muted-sm">${esc(v.observations || "—")}</td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            </div>`
          : `<p class="muted-sm">Sin tomas de signos vitales registradas aún.</p>`
      }
    </div>

    <form id="mod2-form">
      <div class="form-grid">
        <div class="form-field">
          <label>Tipo de Sangre</label>
          <input type="text" name="blood_type" value="${esc(med.blood_type || "")}" placeholder="O+, A+, B-..." ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field">
          <label>Sustancia principal de consumo</label>
          <input type="text" name="primary_substance" value="${esc(med.primary_substance || "")}" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field">
          <label>Años de consumo</label>
          <input type="number" name="years_of_use" value="${esc(med.years_of_use ?? "")}" min="0" max="80" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field">
          <label>Alergias conocidas</label>
          <input type="text" name="allergies" value="${esc(med.allergies || "")}" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field full">
          <label>Antecedentes patológicos y heredofamiliares</label>
          <textarea name="pathological_history" ${canWrite ? "" : "disabled"}>${esc(med.pathological_history || "")}</textarea>
        </div>
        <div class="form-field full">
          <label>Historia detallada de consumo de sustancias</label>
          <textarea name="substance_use_history" ${canWrite ? "" : "disabled"}>${esc(med.substance_use_history || "")}</textarea>
        </div>
        <div class="form-field full">
          <label>Examen físico inicial</label>
          <textarea name="physical_exam_summary" ${canWrite ? "" : "disabled"}>${esc(med.physical_exam_summary || "")}</textarea>
        </div>
        <div class="form-field full">
          <label>Protocolo de desintoxicación e indicaciones generales</label>
          <textarea name="detox_protocol" ${canWrite ? "" : "disabled"}>${esc(med.detox_protocol || "")}</textarea>
        </div>
        <div class="form-field full">
          <label>Alertas médicas especiales</label>
          <input type="text" name="medical_alerts" value="${esc(med.medical_alerts || "")}" ${canWrite ? "" : "disabled"} />
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="card-header">
          <h3 class="card-title">Recetas y Control de Medicamentos</h3>
          ${canWrite ? `<button type="button" id="btn-add-rx" class="btn btn-secondary btn-sm">+ Agregar Medicamento</button>` : ""}
        </div>
        <div id="rx-list"></div>
      </div>

      <div id="sig-block-mod2"></div>

      ${canWrite ? `<div style="display:flex;justify-content:flex-end;margin-top:18px;"><button type="submit" class="btn btn-primary">Guardar y Firmar Historia Médica</button></div>` : ""}
    </form>
  `;

  const rxEl = document.getElementById("rx-list");
  function renderRx() {
    if (!prescriptions.length) {
      rxEl.innerHTML = `<p class="muted-sm">Sin medicamentos prescritos actualmente.</p>`;
      return;
    }
    rxEl.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Vía</th><th>Estado</th>${canWrite ? "<th></th>" : ""}</tr></thead>
          <tbody>
            ${prescriptions
              .map(
                (r, idx) => `
              <tr>
                <td><strong>${esc(r.medication)}</strong></td>
                <td>${esc(r.dose)}</td>
                <td>${esc(r.frequency)}</td>
                <td>${esc(r.route || "Oral")}</td>
                <td><span class="badge badge-green">${esc(r.status || "ACTIVO")}</span></td>
                ${canWrite ? `<td><button type="button" class="btn btn-ghost btn-sm" data-rm-rx="${idx}">Quitar</button></td>` : ""}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    rxEl.querySelectorAll("[data-rm-rx]").forEach((b) => {
      b.addEventListener("click", () => {
        prescriptions.splice(Number(b.getAttribute("data-rm-rx")), 1);
        renderRx();
      });
    });
  }
  renderRx();

  document.getElementById("btn-add-rx")?.addEventListener("click", () => {
    openModal(
      "Prescribir Medicamento",
      `
      <form id="modal-rx-form" class="form-grid" style="grid-template-columns:1fr;">
        <div class="form-field"><label>Medicamento *</label><input name="medication" required placeholder="Ej. Valproato de magnesio" /></div>
        <div class="form-field"><label>Dosis *</label><input name="dose" required placeholder="Ej. 400 mg" /></div>
        <div class="form-field"><label>Frecuencia *</label><input name="frequency" required placeholder="Ej. Cada 12 horas" /></div>
        <div class="form-field"><label>Vía de administración</label><input name="route" value="Oral" /></div>
        <button type="submit" class="btn btn-primary">Añadir a Receta</button>
      </form>`
    );
    document.getElementById("modal-rx-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      prescriptions.push({
        medication: fd.get("medication"),
        dose: fd.get("dose"),
        frequency: fd.get("frequency"),
        route: fd.get("route"),
        status: "ACTIVO",
      });
      closeModal();
      renderRx();
    });
  });

  document.getElementById("btn-new-vitals")?.addEventListener("click", () => {
    openModal(
      "Registrar Signos Vitales",
      `
      <form id="modal-vitals-form" class="form-grid">
        <div class="form-field"><label>TA Sistólica (mmHg)</label><input type="number" name="bp_systolic" placeholder="120" /></div>
        <div class="form-field"><label>TA Diastólica (mmHg)</label><input type="number" name="bp_diastolic" placeholder="80" /></div>
        <div class="form-field"><label>Frecuencia Cardíaca (lpm)</label><input type="number" name="heart_rate" placeholder="76" /></div>
        <div class="form-field"><label>Frecuencia Respiratoria (rpm)</label><input type="number" name="respiratory_rate" placeholder="18" /></div>
        <div class="form-field"><label>Temperatura (°C)</label><input type="number" step="0.1" name="temperature_c" placeholder="36.5" /></div>
        <div class="form-field"><label>Saturación SpO2 (%)</label><input type="number" name="spo2_percent" placeholder="98" /></div>
        <div class="form-field"><label>Glucosa Capilar (mg/dL)</label><input type="number" name="glucose_mg_dl" placeholder="95" /></div>
        <div class="form-field full"><label>Observaciones clínicas</label><input type="text" name="observations" placeholder="Estado general durante la toma" /></div>
        <div class="form-field full"><button type="submit" class="btn btn-primary">Guardar Signos Vitales</button></div>
      </form>`
    );
    document.getElementById("modal-vitals-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {};
      for (const [k, v] of fd.entries()) {
        if (String(v).trim() !== "") {
          body[k] = k === "observations" ? String(v).trim() : Number(v);
        }
      }
      try {
        await apiRequest(`/api/v1/patients/${chart.patient.id}/vitals`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        closeModal();
        showToast("Signos vitales registrados.", "success");
        reload();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  const sigMod2 = mountFormatSignatureBlock(document.getElementById("sig-block-mod2"), {
    prefix: "mod2",
    patient: chart.patient,
    existingSignatures: med.signatures_json,
    canWrite,
    includeFamily: true,
    formatTitle: "Módulo 2 — Historia Clínica Médica, Nutrición y Recetas",
    getPrintRows: () => {
      const fd = new FormData(document.getElementById("mod2-form"));
      return [
        { label: "Tipo de Sangre / Alergias", value: `Tipo: ${fd.get("blood_type") || "—"} · Alergias: ${fd.get("allergies") || "Negadas"}` },
        { label: "Antecedentes Patológicos", value: fd.get("pathological_history") },
        { label: "Historia de Consumo", value: `${fd.get("primary_substance") || "—"} (${fd.get("years_of_use") || "—"} años) — ${fd.get("substance_use_history") || ""}` },
        { label: "Examen Físico Inicial", value: fd.get("physical_exam_summary") },
        { label: "Protocolo de Desintoxicación / Plan Médico-Nutricional", value: fd.get("detox_protocol") },
        { label: "Recetas Activas", value: prescriptions.length ? prescriptions.map((r) => `• ${r.medication} ${r.dose} — ${r.frequency} (${r.route || "Oral"})`).join("\n") : "Sin medicamentos prescritos" },
      ];
    },
  });

  if (canWrite) {
    document.getElementById("mod2-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const signatures_json = await sigMod2.collectSignatures();
      const payload = {
        blood_type: fd.get("blood_type") || null,
        allergies: fd.get("allergies") || null,
        pathological_history: fd.get("pathological_history") || null,
        substance_use_history: fd.get("substance_use_history") || null,
        primary_substance: fd.get("primary_substance") || null,
        years_of_use: fd.get("years_of_use") ? Number(fd.get("years_of_use")) : null,
        physical_exam_summary: fd.get("physical_exam_summary") || null,
        detox_protocol: fd.get("detox_protocol") || null,
        medical_alerts: fd.get("medical_alerts") || null,
        prescriptions_json: prescriptions,
        signatures_json,
      };
      try {
        await apiRequest(`/api/v1/patients/${chart.patient.id}/medical`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast("Módulo 2 guardado y firmado correctamente.", "success");
        reload();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
}

/* ============================================================================
 * MÓDULO 3: PSICOLOGÍA Y PSIQUIATRÍA (CIE-11 / DSM-5)
 * ========================================================================== */
function renderModule3Psychology(el, chart, reload) {
  const access = chart.modules.psychology.access;
  const canWrite = access === "write" || access === "full";
  const psy = chart.modules.psychology.data || {};
  let tests = Array.isArray(psy.psychometric_tests_json) ? [...psy.psychometric_tests_json] : [];

  el.innerHTML = `
    <div class="card-header">
      <div>
        <h2 class="card-title">Módulo 3: Psicología y Psiquiatría (CIE-11 / DSM-5)</h2>
        <p class="muted-sm">Permiso actual: <strong>${accessLabel(access)}</strong></p>
      </div>
      <span class="badge ${psy.risk_level === "ALTO" ? "badge-red" : psy.risk_level === "MODERADO" ? "badge-gold" : "badge-green"}">
        Nivel de riesgo: ${esc(psy.risk_level || "BAJO")}
      </span>
    </div>

    <form id="mod3-form">
      <div class="form-grid">
        <div class="form-field">
          <label>Codificación Diagnóstica CIE-11</label>
          <input type="text" name="cie11_code" value="${esc(psy.cie11_code || "")}" placeholder="Ej. 6C40.2" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field">
          <label>Codificación Diagnóstica DSM-5</label>
          <input type="text" name="dsm5_code" value="${esc(psy.dsm5_code || "")}" placeholder="Ej. F10.20" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field">
          <label>Evaluación de Riesgo Clínico</label>
          <select name="risk_level" ${canWrite ? "" : "disabled"}>
            <option value="BAJO" ${psy.risk_level === "BAJO" ? "selected" : ""}>Bajo</option>
            <option value="MODERADO" ${psy.risk_level === "MODERADO" ? "selected" : ""}>Moderado</option>
            <option value="ALTO" ${psy.risk_level === "ALTO" ? "selected" : ""}>Alto (vigilancia estrecha)</option>
          </select>
        </div>
        <div class="form-field">
          <label>Impresión Diagnóstica</label>
          <input type="text" name="diagnosis_description" value="${esc(psy.diagnosis_description || "")}" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field full">
          <label>Anamnesis Psicológica</label>
          <textarea name="anamnesis" ${canWrite ? "" : "disabled"}>${esc(psy.anamnesis || "")}</textarea>
        </div>
        <div class="form-field full">
          <label>Historia de Vida y Dinámica Emocional</label>
          <textarea name="life_history" ${canWrite ? "" : "disabled"}>${esc(psy.life_history || "")}</textarea>
        </div>
        <div class="form-field full">
          <label>Examen del Estado Mental</label>
          <textarea name="mental_status_exam" ${canWrite ? "" : "disabled"}>${esc(psy.mental_status_exam || "")}</textarea>
        </div>
        <div class="form-field full">
          <label>Plan de Tratamiento Terapéutico Individualizado y Objetivos</label>
          <textarea name="treatment_plan" ${canWrite ? "" : "disabled"}>${esc(psy.treatment_plan || "")}</textarea>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="card-header">
          <h3 class="card-title">Pruebas Psicométricas Aplicadas</h3>
          ${canWrite ? `<button type="button" id="btn-add-psych-test" class="btn btn-secondary btn-sm">+ Registrar Prueba</button>` : ""}
        </div>
        <div id="psych-tests-list"></div>
      </div>

      <div id="sig-block-mod3"></div>

      ${canWrite ? `<div style="display:flex;justify-content:flex-end;margin-top:18px;"><button type="submit" class="btn btn-primary">Guardar y Firmar Evaluación Psicológica / Psiquiátrica</button></div>` : ""}
    </form>
  `;

  const testsEl = document.getElementById("psych-tests-list");
  function renderTests() {
    if (!tests.length) {
      testsEl.innerHTML = `<p class="muted-sm">Sin pruebas psicométricas registradas.</p>`;
      return;
    }
    testsEl.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Instrumento / Prueba</th><th>Fecha</th><th>Puntaje</th><th>Interpretación</th>${canWrite ? "<th></th>" : ""}</tr></thead>
          <tbody>
            ${tests
              .map(
                (t, idx) => `
              <tr>
                <td><strong>${esc(t.test)}</strong></td>
                <td class="muted-sm">${esc(t.date || "—")}</td>
                <td class="mono">${esc(t.score || "—")}</td>
                <td>${esc(t.interpretation || "—")}</td>
                ${canWrite ? `<td><button type="button" class="btn btn-ghost btn-sm" data-rm-test="${idx}">Quitar</button></td>` : ""}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
    testsEl.querySelectorAll("[data-rm-test]").forEach((b) => {
      b.addEventListener("click", () => {
        tests.splice(Number(b.getAttribute("data-rm-test")), 1);
        renderTests();
      });
    });
  }
  renderTests();

  document.getElementById("btn-add-psych-test")?.addEventListener("click", () => {
    openModal(
      "Registrar Prueba Psicométrica",
      `
      <form id="modal-test-form" class="form-grid" style="grid-template-columns:1fr;">
        <div class="form-field"><label>Prueba aplicada *</label><input name="test" required placeholder="Ej. Inventario de Beck (BAI / BDI), ASSIST OMS..." /></div>
        <div class="form-field"><label>Fecha</label><input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
        <div class="form-field"><label>Puntaje *</label><input name="score" required placeholder="Ej. 14 pts" /></div>
        <div class="form-field"><label>Interpretación clínica *</label><input name="interpretation" required placeholder="Ej. Ansiedad leve" /></div>
        <button type="submit" class="btn btn-primary">Añadir Resultado</button>
      </form>`
    );
    document.getElementById("modal-test-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      tests.push({
        test: fd.get("test"),
        date: fd.get("date"),
        score: fd.get("score"),
        interpretation: fd.get("interpretation"),
      });
      closeModal();
      renderTests();
    });
  });

  const sigMod3 = mountFormatSignatureBlock(document.getElementById("sig-block-mod3"), {
    prefix: "mod3",
    patient: chart.patient,
    existingSignatures: psy.signatures_json,
    canWrite,
    includeFamily: true,
    formatTitle: "Módulo 3 — Evaluación Psicológica y Psiquiátrica (CIE-11 / DSM-5)",
    getPrintRows: () => {
      const fd = new FormData(document.getElementById("mod3-form"));
      return [
        { label: "Codificación Diagnóstica", value: `CIE-11: ${fd.get("cie11_code") || "—"} · DSM-5: ${fd.get("dsm5_code") || "—"} · Riesgo: ${fd.get("risk_level")}` },
        { label: "Impresión Diagnóstica", value: fd.get("diagnosis_description") },
        { label: "Anamnesis Psicológica", value: fd.get("anamnesis") },
        { label: "Historia de Vida", value: fd.get("life_history") },
        { label: "Examen del Estado Mental", value: fd.get("mental_status_exam") },
        { label: "Plan Terapéutico Individualizado", value: fd.get("treatment_plan") },
        { label: "Pruebas Psicométricas", value: tests.length ? tests.map((t) => `• ${t.test} (${t.date}): ${t.score} — ${t.interpretation}`).join("\n") : "Sin pruebas registradas" },
      ];
    },
  });

  if (canWrite) {
    document.getElementById("mod3-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const signatures_json = await sigMod3.collectSignatures();
      const payload = {
        cie11_code: fd.get("cie11_code") || null,
        dsm5_code: fd.get("dsm5_code") || null,
        risk_level: fd.get("risk_level"),
        diagnosis_description: fd.get("diagnosis_description") || null,
        anamnesis: fd.get("anamnesis") || null,
        life_history: fd.get("life_history") || null,
        mental_status_exam: fd.get("mental_status_exam") || null,
        treatment_plan: fd.get("treatment_plan") || null,
        psychometric_tests_json: tests,
        signatures_json,
      };
      try {
        await apiRequest(`/api/v1/patients/${chart.patient.id}/psychology`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast("Módulo 3 guardado y firmado correctamente.", "success");
        reload();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
}

/* ============================================================================
 * MÓDULO 4: CONSEJERÍA Y MENTORÍA (PROGRAMA DE 12 PASOS)
 * ========================================================================== */
function renderModule4Counseling(el, chart, reload) {
  const access = chart.modules.counseling.access;
  const canWrite = access === "write" || access === "full";
  const c = chart.modules.counseling.data || { current_step: 1, steps_progress_json: [], sessions_log_json: [] };
  let currentStep = Number(c.current_step || 1);
  let steps = Array.isArray(c.steps_progress_json) && c.steps_progress_json.length === 12
    ? c.steps_progress_json.map((s) => ({ ...s }))
    : Array.from({ length: 12 }, (_, i) => ({
        step: i + 1,
        title: `Paso ${i + 1}`,
        status: i + 1 < currentStep ? "COMPLETADO" : i + 1 === currentStep ? "EN_PROCESO" : "PENDIENTE",
      }));
  const sessions = Array.isArray(c.sessions_log_json) ? c.sessions_log_json : [];

  el.innerHTML = `
    <div class="card-header">
      <div>
        <h2 class="card-title">Módulo 4: Consejería y Mentoría — Programa de 12 Pasos</h2>
        <p class="muted-sm">Permiso actual: <strong>${accessLabel(access)}</strong> · Paso actual: <strong>Paso ${currentStep} de 12</strong></p>
      </div>
      ${canWrite ? `<button type="button" id="btn-new-session" class="btn btn-primary btn-sm">+ Registrar Sesión</button>` : ""}
    </div>

    <div class="card" style="margin-bottom:18px;">
      <h3 class="card-title" style="margin-bottom:10px;">Progreso en el Programa de 12 Pasos</h3>
      <p class="muted-sm" style="margin-bottom:12px;">${canWrite ? "Haz clic en el paso actual del paciente para actualizar su avance:" : "Vista de seguimiento del avance:"}</p>
      <div class="steps-grid" id="twelve-steps-grid"></div>

      <form id="mod4-form" style="margin-top:16px;">
        <div class="form-grid">
          <div class="form-field">
            <label>Consejero / Mentor asignado</label>
            <input type="text" name="mentor_name" value="${esc(c.mentor_name || "")}" ${canWrite ? "" : "disabled"} />
          </div>
          <div class="form-field">
            <label>Paso actual (1–12)</label>
            <input type="number" id="input-current-step" name="current_step" min="1" max="12" value="${currentStep}" ${canWrite ? "" : "disabled"} />
          </div>
          <div class="form-field full">
            <label>Observaciones de consejería y mentoría vivencial</label>
            <textarea name="counselor_notes" ${canWrite ? "" : "disabled"}>${esc(c.counselor_notes || "")}</textarea>
          </div>
        </div>
        <div id="sig-block-mod4"></div>

        ${canWrite ? `<div style="display:flex;justify-content:flex-end;margin-top:14px;"><button type="submit" class="btn btn-primary">Guardar y Firmar Avance de 12 Pasos</button></div>` : ""}
      </form>
    </div>

    <div class="card">
      <h3 class="card-title" style="margin-bottom:12px;">Bitácora de Sesiones Individuales, Grupales y Mentoría</h3>
      ${
        sessions.length
          ? sessions
              .map(
                (s) => `
            <div style="padding:12px;border:1px solid var(--border-light);border-radius:11px;margin-bottom:10px;background:var(--bg-canvas);">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                <div>
                  <span class="badge badge-blue">${esc(s.session_type)}</span>
                  ${s.step_focus ? `<span class="badge badge-gold">Paso ${esc(s.step_focus)}</span>` : ""}
                </div>
                <span class="muted-sm">${esc(s.session_date)}</span>
              </div>
              <p style="margin:0 0 6px;font-size:0.9rem;">${esc(s.summary)}</p>
              ${s.agreements ? `<p class="muted-sm"><strong>Acuerdos:</strong> ${esc(s.agreements)}</p>` : ""}
            </div>`
              )
              .join("")
          : `<p class="muted-sm">Sin sesiones registradas todavía.</p>`
      }
    </div>
  `;

  const gridEl = document.getElementById("twelve-steps-grid");
  const stepInput = document.getElementById("input-current-step");

  function drawSteps() {
    gridEl.innerHTML = steps
      .map((st) => {
        const cls = st.step < currentStep ? "done" : st.step === currentStep ? "current" : "";
        const lbl = st.step < currentStep ? "Completado" : st.step === currentStep ? "En proceso" : "Pendiente";
        return `
          <div class="step-chip ${cls}" data-step="${st.step}">
            <span class="step-chip-title">${esc(st.title)}</span>
            <span class="badge ${cls === "done" ? "badge-green" : cls === "current" ? "badge-blue" : "badge-gray"}">${lbl}</span>
          </div>`;
      })
      .join("");

    if (canWrite) {
      gridEl.querySelectorAll("[data-step]").forEach((chip) => {
        chip.addEventListener("click", () => {
          currentStep = Number(chip.getAttribute("data-step"));
          if (stepInput) stepInput.value = currentStep;
          steps = steps.map((s) => ({
            ...s,
            status: s.step < currentStep ? "COMPLETADO" : s.step === currentStep ? "EN_PROCESO" : "PENDIENTE",
          }));
          drawSteps();
        });
      });
    }
  }
  drawSteps();

  document.getElementById("btn-new-session")?.addEventListener("click", () => {
    openModal(
      "Registrar Sesión de Consejería",
      `
      <form id="modal-session-form" class="form-grid" style="grid-template-columns:1fr;">
        <div class="form-field"><label>Fecha</label><input type="date" name="session_date" value="${new Date().toISOString().slice(0, 10)}" required /></div>
        <div class="form-field">
          <label>Tipo de sesión</label>
          <select name="session_type">
            <option value="INDIVIDUAL">Individual</option>
            <option value="GRUPAL">Grupal</option>
            <option value="MENTORIA_VIVENCIAL">Mentoría Vivencial</option>
          </select>
        </div>
        <div class="form-field"><label>Paso trabajado (1–12)</label><input type="number" name="step_focus" min="1" max="12" value="${currentStep}" /></div>
        <div class="form-field"><label>Resumen de sesión *</label><textarea name="summary" required></textarea></div>
        <div class="form-field"><label>Acuerdos / Compromisos</label><input type="text" name="agreements" /></div>
        <button type="submit" class="btn btn-primary">Guardar Sesión</button>
      </form>`
    );
    document.getElementById("modal-session-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await apiRequest(`/api/v1/patients/${chart.patient.id}/counseling/sessions`, {
          method: "POST",
          body: JSON.stringify({
            session_date: fd.get("session_date"),
            session_type: fd.get("session_type"),
            step_focus: fd.get("step_focus") ? Number(fd.get("step_focus")) : null,
            summary: fd.get("summary"),
            agreements: fd.get("agreements") || null,
          }),
        });
        closeModal();
        showToast("Sesión de consejería agregada.", "success");
        reload();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  const sigMod4 = mountFormatSignatureBlock(document.getElementById("sig-block-mod4"), {
    prefix: "mod4",
    patient: chart.patient,
    existingSignatures: c.signatures_json,
    canWrite,
    includeFamily: true,
    formatTitle: "Módulo 4 — Consejería en Adicciones y Programa de 12 Pasos",
    getPrintRows: () => {
      const fd = new FormData(document.getElementById("mod4-form"));
      return [
        { label: "Consejero / Mentor Asignado", value: fd.get("mentor_name") },
        { label: "Paso Actual en el Programa de 12 Pasos", value: `Paso ${fd.get("current_step") || currentStep} de 12` },
        { label: "Observaciones de Consejería", value: fd.get("counselor_notes") },
        { label: "Sesiones Recientes", value: sessions.length ? sessions.slice(0, 5).map((s) => `• ${s.session_date} [${s.session_type}] Paso ${s.step_focus || "—"}: ${s.summary}`).join("\n") : "Sin sesiones registradas" },
      ];
    },
  });

  if (canWrite) {
    document.getElementById("mod4-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const stepVal = Number(fd.get("current_step") || currentStep);
      const signatures_json = await sigMod4.collectSignatures();
      const updatedSteps = steps.map((s) => ({
        ...s,
        status: s.step < stepVal ? "COMPLETADO" : s.step === stepVal ? "EN_PROCESO" : "PENDIENTE",
      }));
      try {
        await apiRequest(`/api/v1/patients/${chart.patient.id}/counseling`, {
          method: "PUT",
          body: JSON.stringify({
            current_step: stepVal,
            steps_progress_json: updatedSteps,
            mentor_name: fd.get("mentor_name") || null,
            counselor_notes: fd.get("counselor_notes") || null,
            signatures_json,
          }),
        });
        showToast("Avance de Consejería (12 Pasos) guardado y firmado.", "success");
        reload();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
}

/* ============================================================================
 * MÓDULO 5: NOTAS DE EVOLUCIÓN SOAP + ASISTENTE IA GEMINI + SHA-256 + ADENDAS
 * ========================================================================== */
function renderModule5Soap(el, chart, reload) {
  const access = chart.modules.soap.access;
  const canWrite = access === "write" || access === "full";
  const notes = chart.modules.soap.notes || [];
  const draftKey = `angeles_soap_draft_${chart.patient.id}`;
  let savedDraft = {};
  try {
    savedDraft = JSON.parse(localStorage.getItem(draftKey) || "{}");
  } catch {
    savedDraft = {};
  }

  let aiUsed = Boolean(savedDraft.ai_assisted);

  el.innerHTML = `
    <div class="card-header">
      <div>
        <h2 class="card-title">Módulo 5: Notas de Evolución Diaria (Formato SOAP Inmutable)</h2>
        <p class="muted-sm">Firma digital SHA-256 vinculada a cédula profesional · Las notas firmadas no se eliminan (solo Adendas).</p>
      </div>
      <span class="badge badge-green">${notes.length} notas firmadas</span>
    </div>

    ${
      canWrite
        ? `
      <div class="ai-assistant-box">
        <div class="card-header" style="margin-bottom:8px;">
          <h3 class="card-title">Asistente Clínico con IA (Google Gemini)</h3>
          <span class="badge badge-blue">Borrador Editable · Nunca Auto-Guarda</span>
        </div>
        <p class="muted-sm" style="margin-bottom:10px;">
          Escribe o dicta tus observaciones clínicas en lenguaje natural y presiona <strong>“Estructurar con IA”</strong> para organizar automáticamente un borrador S-O-A-P que podrás editar antes de firmar.
        </p>
        <div class="form-field">
          <textarea id="soap-raw-dictation" rows="3" placeholder="Ej. El paciente refiere insomnio leve. Presión arterial 120/80. Se observa tranquilo pero ansioso sobre su reinserción laboral. Recomiendo mantener dosis de valproato y sesión psicológica.">${esc(savedDraft.raw_dictation || "")}</textarea>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
          <button type="button" id="btn-ai-structure" class="btn btn-primary btn-sm">Estructurar con IA (Gemini)</button>
          <button type="button" id="btn-voice-dictate" class="btn btn-secondary btn-sm">Dictar por Voz (es-MX)</button>
          <span id="ai-provider-badge" class="muted-sm" style="align-self:center;"></span>
        </div>
        <div id="ai-safety-box" class="safety-banner hidden"></div>
      </div>

      <form id="soap-new-form" class="card" style="margin-bottom:22px;">
        <div class="card-header" style="margin-bottom:12px;">
          <h3 class="card-title">Nueva Nota de Evolución SOAP</h3>
          <select name="note_category" style="min-height:38px;padding:0 12px;border-radius:9px;border:1px solid var(--border-medium);background:#fff;">
            <option value="EVOLUCION_MEDICA">Evolución Médica</option>
            <option value="EVOLUCION_PSICOLOGICA">Evolución Psicológica</option>
            <option value="CONSEJERIA_DIARIA">Seguimiento Consejería</option>
            <option value="TRABAJO_SOCIAL">Nota Trabajo Social</option>
          </select>
        </div>

        <div class="form-grid">
          <div class="form-field">
            <label for="soap-s">S — Subjetivo (Lo que expresa el paciente) *</label>
            <textarea id="soap-s" name="subjective" required>${esc(savedDraft.subjective || "")}</textarea>
          </div>
          <div class="form-field">
            <label for="soap-o">O — Objetivo (Signos vitales, conducta observable) *</label>
            <textarea id="soap-o" name="objective" required>${esc(savedDraft.objective || "")}</textarea>
          </div>
          <div class="form-field">
            <label for="soap-a">A — Análisis / Evaluación profesional *</label>
            <textarea id="soap-a" name="assessment" required>${esc(savedDraft.assessment || "")}</textarea>
          </div>
          <div class="form-field">
            <label for="soap-p">P — Plan (Indicaciones y siguientes pasos) *</label>
            <textarea id="soap-p" name="plan" required>${esc(savedDraft.plan || "")}</textarea>
          </div>
        </div>

        <div id="sig-block-mod5"></div>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;flex-wrap:wrap;">
          <span class="muted-sm">Borrador respaldado localmente en este dispositivo ante pérdida de conexión.</span>
          <button type="submit" id="btn-sign-soap" class="btn btn-primary">Revisar y Firmar Nota (SHA-256)</button>
        </div>
      </form>`
        : ""
    }

    <h3 class="card-title" style="margin-bottom:12px;">Historial Cronológico Inmutable</h3>
    ${
      notes.length
        ? notes
            .map(
              (n) => `
          <article class="soap-card ${n.is_addendum ? "is-addendum" : ""}">
            <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span class="badge ${n.is_addendum ? "badge-gold" : "badge-blue"}">
                  ${n.is_addendum ? `Nota Aclaratoria / Adenda a #${n.parent_note_id}` : esc(n.note_category)}
                </span>
                ${n.ai_assisted ? `<span class="badge badge-green">Asistida por IA (Confirmada)</span>` : ""}
                <strong>${esc(n.author_name)}</strong>
                <span class="muted-sm">(${esc(n.author_role)} · Céd. ${esc(n.professional_license || "N/A")})</span>
              </div>
              <span class="muted-sm">${formatDateTime(n.signed_at)}</span>
            </div>

            <div class="soap-grid">
              <div class="soap-quad"><strong>S · Subjetivo</strong><p>${esc(n.subjective)}</p></div>
              <div class="soap-quad"><strong>O · Objetivo</strong><p>${esc(n.objective)}</p></div>
              <div class="soap-quad"><strong>A · Análisis</strong><p>${esc(n.assessment)}</p></div>
              <div class="soap-quad"><strong>P · Plan</strong><p>${esc(n.plan)}</p></div>
            </div>

            <div class="hash-strip">
              <span class="mono" style="word-break:break-all;">Firma SHA-256: ${esc(n.digital_signature_hash)}</span>
              ${
                canWrite && !n.is_addendum
                  ? `<button type="button" class="btn btn-gold btn-sm" data-addendum-id="${n.id}">+ Nota Aclaratoria / Adenda</button>`
                  : ""
              }
            </div>
          </article>`
            )
            .join("")
        : `<p class="muted-sm">Aún no existen notas SOAP firmadas en este expediente.</p>`
    }
  `;

  if (canWrite) {
    const rawEl = document.getElementById("soap-raw-dictation");
    const sEl = document.getElementById("soap-s");
    const oEl = document.getElementById("soap-o");
    const aEl = document.getElementById("soap-a");
    const pEl = document.getElementById("soap-p");

    const persistDraft = () => {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          raw_dictation: rawEl.value,
          subjective: sEl.value,
          objective: oEl.value,
          assessment: aEl.value,
          plan: pEl.value,
          ai_assisted: aiUsed,
        })
      );
    };
    [rawEl, sEl, oEl, aEl, pEl].forEach((input) => input.addEventListener("input", persistDraft));

    // Dictado por voz (Web Speech API)
    document.getElementById("btn-voice-dictate")?.addEventListener("click", () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        showToast("El dictado por voz no está soportado en este navegador; puedes escribir el texto libre.", "info");
        return;
      }
      const recognition = new SR();
      recognition.lang = "es-MX";
      recognition.interimResults = false;
      recognition.onstart = () => showToast("Escuchando dictado clínico (es-MX)...", "info");
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        rawEl.value = rawEl.value ? `${rawEl.value} ${transcript}` : transcript;
        persistDraft();
      };
      recognition.onerror = () => showToast("No se pudo capturar audio. Revisa permisos del micrófono.", "error");
      recognition.start();
    });

    // Asistente IA Gemini (/api/v1/ai/assist-soap)
    document.getElementById("btn-ai-structure")?.addEventListener("click", async () => {
      const rawText = rawEl.value.trim();
      if (rawText.length < 10) {
        showToast("Escribe o dicta al menos una breve observación clínica antes de estructurar con IA.", "error");
        return;
      }
      const btn = document.getElementById("btn-ai-structure");
      btn.disabled = true;
      btn.textContent = "Estructurando borrador SOAP...";
      try {
        const res = await apiRequest("/api/v1/ai/assist-soap", {
          method: "POST",
          body: JSON.stringify({
            patient_id: chart.patient.folio,
            raw_clinician_dictation: rawText,
          }),
        });
        sEl.value = res.suggested_soap.subjective;
        oEl.value = res.suggested_soap.objective;
        aEl.value = res.suggested_soap.assessment;
        pEl.value = res.suggested_soap.plan;
        aiUsed = true;
        persistDraft();
        const safety = document.getElementById("ai-safety-box");
        safety.textContent = res.safety_notice;
        safety.classList.remove("hidden");
        document.getElementById("ai-provider-badge").textContent = `Motor: ${res.ai_provider}`;
        showToast("Borrador SOAP generado. Revísalo y edítalo antes de firmar.", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btn.disabled = false;
        btn.textContent = "Estructurar con IA (Gemini)";
      }
    });

    const sigMod5 = mountFormatSignatureBlock(document.getElementById("sig-block-mod5"), {
      prefix: "mod5",
      patient: chart.patient,
      existingSignatures: null,
      canWrite,
      includeFamily: true,
      formatTitle: "Módulo 5 — Nota de Evolución Clínica (Formato SOAP)",
      getPrintRows: () => [
        { label: "S — Subjetivo", value: sEl.value.trim() },
        { label: "O — Objetivo", value: oEl.value.trim() },
        { label: "A — Análisis / Evaluación", value: aEl.value.trim() },
        { label: "P — Plan e Indicaciones", value: pEl.value.trim() },
      ],
    });

    // Firmar Nota SOAP con SHA-256 + Firmas Digitales / Biometría
    document.getElementById("soap-new-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const signatures_json = await sigMod5.collectSignatures();
      try {
        const signed = await apiRequest("/api/v1/clinical/soap-notes", {
          method: "POST",
          body: JSON.stringify({
            patient_id: chart.patient.id,
            note_category: fd.get("note_category"),
            subjective: sEl.value.trim(),
            objective: oEl.value.trim(),
            assessment: aEl.value.trim(),
            plan: pEl.value.trim(),
            raw_dictation: rawEl.value.trim() || null,
            ai_assisted: aiUsed,
            signatures_json,
          }),
        });
        localStorage.removeItem(draftKey);
        showToast(`Nota SOAP firmada (${signed.digital_signature_hash.slice(0, 12)}...).`, "success");
        reload();
      } catch (err) {
        showToast(err.message, "error");
      }
    });

    // Adendas / Notas aclaratorias
    el.querySelectorAll("[data-addendum-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const noteId = btn.getAttribute("data-addendum-id");
        openModal(
          `Nota Aclaratoria / Adenda a Nota #${noteId}`,
          `
          <p class="muted-sm" style="margin-bottom:12px;">Las notas firmadas son inmutables. Esta adenda se vinculará permanentemente a la nota original con su propio sello SHA-256.</p>
          <form id="modal-addendum-form" class="form-grid" style="grid-template-columns:1fr;">
            <div class="form-field"><label>S — Aclaración Subjetiva *</label><textarea name="subjective" required></textarea></div>
            <div class="form-field"><label>O — Aclaración Objetiva *</label><textarea name="objective" required></textarea></div>
            <div class="form-field"><label>A — Aclaración de Análisis *</label><textarea name="assessment" required></textarea></div>
            <div class="form-field"><label>P — Ajuste de Plan *</label><textarea name="plan" required></textarea></div>
            <button type="submit" class="btn btn-primary">Firmar Adenda (SHA-256)</button>
          </form>`
        );
        document.getElementById("modal-addendum-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          try {
            await apiRequest(`/api/v1/clinical/soap-notes/${noteId}/addendum`, {
              method: "POST",
              body: JSON.stringify({
                subjective: fd.get("subjective"),
                objective: fd.get("objective"),
                assessment: fd.get("assessment"),
                plan: fd.get("plan"),
              }),
            });
            closeModal();
            showToast("Nota Aclaratoria / Adenda firmada y vinculada.", "success");
            reload();
          } catch (err) {
            showToast(err.message, "error");
          }
        });
      });
    });
  }
}

/* ============================================================================
 * MÓDULO 6: EGRESO / ALTA Y PLAN DE PREVENCIÓN DE RECAÍDAS
 * ========================================================================== */
function renderModule6Discharge(el, chart, reload) {
  const access = chart.modules.discharge.access;
  const canWrite = access === "write" || access === "full";
  const d = chart.modules.discharge.data || {};

  el.innerHTML = `
    <div class="card-header">
      <div>
        <h2 class="card-title">Módulo 6: Egreso / Alta y Plan de Prevención de Recaídas</h2>
        <p class="muted-sm">Permiso actual: <strong>${accessLabel(access)}</strong></p>
      </div>
      ${d.digital_signature_hash ? `<span class="badge badge-green mono">SHA-256: ${esc(d.digital_signature_hash.slice(0, 14))}...</span>` : ""}
    </div>

    <form id="mod6-form">
      <div class="form-grid">
        <div class="form-field">
          <label>Dictamen de Conclusión de Estancia</label>
          <select name="discharge_type" ${canWrite ? "" : "disabled"}>
            <option value="MEDICAL_THERAPEUTIC" ${d.discharge_type === "MEDICAL_THERAPEUTIC" ? "selected" : ""}>Alta Médica / Terapéutica</option>
            <option value="VOLUNTARY" ${d.discharge_type === "VOLUNTARY" ? "selected" : ""}>Alta Voluntaria</option>
            <option value="TRANSFER" ${d.discharge_type === "TRANSFER" ? "selected" : ""}>Traslado a otra unidad</option>
          </select>
        </div>
        <div class="form-field" style="justify-content:end;">
          <label style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" name="belongings_returned" style="width:20px;height:20px;min-height:auto;" ${d.belongings_returned ? "checked" : ""} ${canWrite ? "" : "disabled"} />
            Inventario de pertenencias entregado íntegramente
          </label>
        </div>
        <div class="form-field full">
          <label>Resumen Clínico de Egreso</label>
          <textarea name="clinical_summary" ${canWrite ? "" : "disabled"}>${esc(d.clinical_summary || "")}</textarea>
        </div>
        <div class="form-field full">
          <label>Notas de devolución de pertenencias</label>
          <input type="text" name="belongings_return_notes" value="${esc(d.belongings_return_notes || "")}" ${canWrite ? "" : "disabled"} />
        </div>
        <div class="form-field full">
          <label>Plan de Prevención de Recaídas</label>
          <textarea name="relapse_prevention_plan" ${canWrite ? "" : "disabled"}>${esc(d.relapse_prevention_plan || "")}</textarea>
        </div>
        <div class="form-field">
          <label>Detonantes de riesgo identificados</label>
          <textarea name="triggers_identified" ${canWrite ? "" : "disabled"}>${esc(d.triggers_identified || "")}</textarea>
        </div>
        <div class="form-field">
          <label>Compromisos de red de apoyo y post-egreso</label>
          <textarea name="support_commitments" ${canWrite ? "" : "disabled"}>${esc(d.support_commitments || "")}</textarea>
        </div>
      </div>

      <div id="sig-block-mod6"></div>

      ${
        canWrite
          ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;flex-wrap:wrap;">
              <label style="display:flex;align-items:center;gap:8px;font-size:0.88rem;font-weight:600;color:var(--blue-900);">
                <input type="checkbox" name="finalize_discharge" style="width:20px;height:20px;" />
                Marcar expediente como EGRESADO / TRASLADADO al guardar
              </label>
              <button type="submit" class="btn btn-primary">Guardar y Firmar Dictamen de Egreso</button>
            </div>`
          : ""
      }
    </form>
  `;

  const sigMod6 = mountFormatSignatureBlock(document.getElementById("sig-block-mod6"), {
    prefix: "mod6",
    patient: chart.patient,
    existingSignatures: d.signatures_json,
    canWrite,
    includeFamily: true,
    formatTitle: "Módulo 6 — Dictamen de Egreso / Alta y Plan de Prevención de Recaídas",
    getPrintRows: () => {
      const fd = new FormData(document.getElementById("mod6-form"));
      return [
        { label: "Tipo de Egreso / Alta", value: fd.get("discharge_type") },
        { label: "Resumen Clínico de Egreso", value: fd.get("clinical_summary") },
        { label: "Entrega de Pertenencias", value: `${fd.get("belongings_returned") === "on" ? "Entregado íntegramente" : "Pendiente"} — ${fd.get("belongings_return_notes") || ""}` },
        { label: "Plan de Prevención de Recaídas", value: fd.get("relapse_prevention_plan") },
        { label: "Detonantes Identificados", value: fd.get("triggers_identified") },
        { label: "Compromisos de Red de Apoyo", value: fd.get("support_commitments") },
      ];
    },
  });

  if (canWrite) {
    document.getElementById("mod6-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const signatures_json = await sigMod6.collectSignatures();
      try {
        await apiRequest(`/api/v1/patients/${chart.patient.id}/discharge`, {
          method: "PUT",
          body: JSON.stringify({
            discharge_type: fd.get("discharge_type"),
            belongings_returned: fd.get("belongings_returned") === "on",
            clinical_summary: fd.get("clinical_summary") || null,
            belongings_return_notes: fd.get("belongings_return_notes") || null,
            relapse_prevention_plan: fd.get("relapse_prevention_plan") || null,
            triggers_identified: fd.get("triggers_identified") || null,
            support_commitments: fd.get("support_commitments") || null,
            finalize_discharge: fd.get("finalize_discharge") === "on",
            signatures_json,
          }),
        });
        showToast("Dictamen de Egreso / Alta guardado y sellado.", "success");
        reload();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
}
