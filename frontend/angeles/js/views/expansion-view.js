/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { apiRequest, closeModal, esc, formatDateOnly, formatDateTime, getStoredUser, openModal, showToast } from "../api.js";
import { canAccess } from "../rbac.js";

export async function renderExpansionView(container) {
  const user = getStoredUser();
  if (!canAccess(user, "expansion", "read")) {
    container.innerHTML = `<div class="card"><h2>Acceso restringido (RBAC)</h2><p class="muted-sm">Tu perfil no tiene autorización para consultar los módulos de expansión.</p></div>`;
    return;
  }

  const canWrite = canAccess(user, "expansion", "write");
  container.innerHTML = `<div class="card"><p class="muted-sm">Cargando módulos de expansión...</p></div>`;

  try {
    const [overview, patients] = await Promise.all([
      apiRequest("/api/v1/expansion/overview"),
      apiRequest("/api/v1/patients"),
    ]);

    const patientOptions = patients
      .map((p) => `<option value="${p.id}">${esc(p.folio)} — ${esc(p.first_name)} ${esc(p.last_name)}</option>`)
      .join("");

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h1 style="font-size:1.55rem;margin-bottom:4px;color:var(--blue-950);">Módulos de Expansión Clínica</h1>
          <p class="muted-sm">Trabajo Social y Entorno Familiar · Laboratorio Toxicológico · Seguimiento Post-Egreso (1, 3, 6 y 12 meses).</p>
        </div>
        ${
          canWrite
            ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" id="btn-add-lab" class="btn btn-secondary btn-sm">+ Registrar Tamizaje</button>
                <button type="button" id="btn-add-followup" class="btn btn-primary btn-sm">+ Programar Seguimiento</button>
              </div>`
            : ""
        }
      </div>

      <div class="grid-2" style="margin-bottom:18px;align-items:start;">
        <!-- Trabajo Social -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Trabajo Social y Entorno Familiar</h2>
            ${canWrite ? `<button type="button" id="btn-add-social" class="btn btn-secondary btn-sm">+ Actualizar Estudio</button>` : ""}
          </div>
          ${
            overview.social_work.length
              ? overview.social_work
                  .map(
                    (s) => `
                <div style="padding:12px;border:1px solid var(--border-light);border-radius:11px;margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;gap:8px;">
                    <strong>${esc(s.patient_name)} <span class="mono">(${esc(s.patient_folio)})</span></strong>
                    <span class="badge badge-green">Red de apoyo: ${s.support_network_score ?? "—"}/10</span>
                  </div>
                  <p class="muted-sm" style="margin-top:6px;"><strong>Nivel socioeconómico:</strong> ${esc(s.socioeconomic_level || "—")}</p>
                  <p class="muted-sm" style="margin-top:4px;">${esc(s.family_structure || s.observations || "")}</p>
                </div>`
                  )
                  .join("")
              : `<p class="muted-sm">Sin estudios socioeconómicos registrados.</p>`
          }
        </section>

        <!-- Laboratorio y Tamizajes -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Laboratorio y Tamizajes Toxicológicos</h2>
            <span class="badge badge-blue">${overview.lab_screenings.length} registros</span>
          </div>
          ${
            overview.lab_screenings.length
              ? `<div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>Expediente</th><th>Estudio</th><th>Resultado</th><th>Fecha</th></tr></thead>
                    <tbody>
                      ${overview.lab_screenings
                        .map(
                          (l) => `
                        <tr>
                          <td><strong>${esc(l.patient_name)}</strong><div class="mono muted-sm">${esc(l.patient_folio)}</div></td>
                          <td>${esc(l.test_type)}</td>
                          <td><span class="badge ${l.result_summary.toUpperCase().includes("NEGATIV") ? "badge-green" : "badge-gold"}">${esc(l.result_summary)}</span></td>
                          <td class="muted-sm">${formatDateTime(l.performed_at)}</td>
                        </tr>`
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>`
              : `<p class="muted-sm">Sin pruebas toxicológicas o de gabinete registradas.</p>`
          }
        </section>
      </div>

      <!-- Seguimiento Post-Egreso -->
      <section class="card">
        <div class="card-header">
          <h2 class="card-title">Calendario de Seguimiento Post-Egreso (1, 3, 6 y 12 meses)</h2>
          <span class="badge badge-gold">${overview.followups.length} citas</span>
        </div>
        ${
          overview.followups.length
            ? `<div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>Paciente</th><th>Hito</th><th>Fecha Programada</th><th>Canal</th><th>Estado</th><th>Notas</th>${canWrite ? "<th>Acción</th>" : ""}</tr></thead>
                  <tbody>
                    ${overview.followups
                      .map(
                        (f) => `
                      <tr>
                        <td><strong>${esc(f.patient_name)}</strong> <span class="mono muted-sm">(${esc(f.patient_folio)})</span></td>
                        <td><span class="badge badge-blue">${f.milestone_months} meses</span></td>
                        <td>${formatDateOnly(f.scheduled_date)}</td>
                        <td>${esc(f.contact_channel)}</td>
                        <td><span class="badge ${f.status === "COMPLETADO" ? "badge-green" : "badge-gold"}">${esc(f.status)}</span></td>
                        <td class="muted-sm">${esc(f.notes || "—")}</td>
                        ${
                          canWrite
                            ? `<td>${f.status !== "COMPLETADO" ? `<button type="button" class="btn btn-secondary btn-sm" data-complete-fu="${f.id}">Completar</button>` : "✓"}</td>`
                            : ""
                        }
                      </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
            : `<p class="muted-sm">No hay seguimientos post-egreso programados.</p>`
        }
      </section>
    `;

    if (canWrite) {
      document.getElementById("btn-add-social")?.addEventListener("click", () => {
        openModal(
          "Registrar Estudio de Trabajo Social",
          `
          <form id="modal-sw-form" class="form-grid" style="grid-template-columns:1fr;">
            <div class="form-field"><label>Expediente *</label><select name="patient_id">${patientOptions}</select></div>
            <div class="form-field"><label>Nivel socioeconómico</label><input name="socioeconomic_level" placeholder="Ej. Medio-bajo estable" /></div>
            <div class="form-field"><label>Calificación red de apoyo (1–10)</label><input type="number" name="support_network_score" min="1" max="10" value="8" /></div>
            <div class="form-field"><label>Estructura familiar y visitas</label><textarea name="family_structure"></textarea></div>
            <div class="form-field"><label>Observaciones</label><textarea name="observations"></textarea></div>
            <button type="submit" class="btn btn-primary">Guardar Estudio</button>
          </form>`
        );
        document.getElementById("modal-sw-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          try {
            await apiRequest(`/api/v1/patients/${fd.get("patient_id")}/social-work`, {
              method: "PUT",
              body: JSON.stringify({
                socioeconomic_level: fd.get("socioeconomic_level") || null,
                support_network_score: Number(fd.get("support_network_score") || 8),
                family_structure: fd.get("family_structure") || null,
                observations: fd.get("observations") || null,
              }),
            });
            closeModal();
            showToast("Estudio de Trabajo Social guardado.", "success");
            renderExpansionView(container);
          } catch (err) {
            showToast(err.message, "error");
          }
        });
      });

      document.getElementById("btn-add-lab")?.addEventListener("click", () => {
        openModal(
          "Registrar Prueba Toxicológica / Laboratorio",
          `
          <form id="modal-lab-form" class="form-grid" style="grid-template-columns:1fr;">
            <div class="form-field"><label>Expediente *</label><select name="patient_id">${patientOptions}</select></div>
            <div class="form-field"><label>Tipo de prueba *</label><input name="test_type" required value="Panel Antidoping 6 parámetros" /></div>
            <div class="form-field"><label>Resumen de resultado *</label><input name="result_summary" required placeholder="NEGATIVO en todos los parámetros" /></div>
            <div class="form-field"><label>Observaciones</label><textarea name="notes"></textarea></div>
            <button type="submit" class="btn btn-primary">Guardar Resultado</button>
          </form>`
        );
        document.getElementById("modal-lab-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          try {
            await apiRequest(`/api/v1/patients/${fd.get("patient_id")}/lab-screenings`, {
              method: "POST",
              body: JSON.stringify({
                test_type: fd.get("test_type"),
                result_summary: fd.get("result_summary"),
                notes: fd.get("notes") || null,
              }),
            });
            closeModal();
            showToast("Prueba toxicológica registrada.", "success");
            renderExpansionView(container);
          } catch (err) {
            showToast(err.message, "error");
          }
        });
      });

      document.getElementById("btn-add-followup")?.addEventListener("click", () => {
        openModal(
          "Programar Seguimiento Post-Egreso",
          `
          <form id="modal-fu-form" class="form-grid" style="grid-template-columns:1fr;">
            <div class="form-field"><label>Expediente *</label><select name="patient_id">${patientOptions}</select></div>
            <div class="form-field">
              <label>Hito post-alta</label>
              <select name="milestone_months">
                <option value="1">1 mes</option>
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
              </select>
            </div>
            <div class="form-field"><label>Fecha programada *</label><input type="date" name="scheduled_date" required value="${new Date().toISOString().slice(0, 10)}" /></div>
            <div class="form-field">
              <label>Canal de contacto</label>
              <select name="contact_channel">
                <option value="LLAMADA">Llamada telefónica</option>
                <option value="CITA_PRESENCIAL">Cita presencial</option>
                <option value="VIDEOLLAMADA">Videollamada</option>
              </select>
            </div>
            <div class="form-field"><label>Notas</label><textarea name="notes"></textarea></div>
            <button type="submit" class="btn btn-primary">Programar Cita</button>
          </form>`
        );
        document.getElementById("modal-fu-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          try {
            await apiRequest(`/api/v1/patients/${fd.get("patient_id")}/followups`, {
              method: "POST",
              body: JSON.stringify({
                milestone_months: Number(fd.get("milestone_months")),
                scheduled_date: fd.get("scheduled_date"),
                contact_channel: fd.get("contact_channel"),
                notes: fd.get("notes") || null,
              }),
            });
            closeModal();
            showToast("Seguimiento post-egreso programado.", "success");
            renderExpansionView(container);
          } catch (err) {
            showToast(err.message, "error");
          }
        });
      });

      container.querySelectorAll("[data-complete-fu]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-complete-fu");
          try {
            await apiRequest(`/api/v1/followups/${id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: "COMPLETADO", abstinence_status: "EN_ABSTINENCIA" }),
            });
            showToast("Seguimiento marcado como completado.", "success");
            renderExpansionView(container);
          } catch (err) {
            showToast(err.message, "error");
          }
        });
      });
    }
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--danger-600);">${esc(err.message)}</p></div>`;
  }
}
