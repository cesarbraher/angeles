/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { apiRequest, esc, formatDateOnly, getStoredUser, showToast } from "../api.js";
import { canAccess, statusBadge } from "../rbac.js";

export async function renderPatientsListView(container, navigate) {
  const user = getStoredUser();
  const canCreate = canAccess(user, "admission", "write");

  container.innerHTML = `
    <div class="card-header" style="margin-bottom:18px;">
      <div>
        <h1 style="font-size:1.55rem;margin-bottom:4px;color:var(--blue-950);">Expedientes Clínicos</h1>
        <p class="muted-sm">Búsqueda rápida por nombre, folio interno (ANG-2026-XXX) o CURP.</p>
      </div>
      ${canCreate ? `<a href="/angeles/expedientes/nuevo" class="btn btn-primary" data-link>+ Registrar Nuevo Ingreso</a>` : ""}
    </div>

    <div class="card" style="margin-bottom:18px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
        <input type="search" id="patients-filter-q" placeholder="Filtrar por nombre, folio o CURP..." style="flex:1 1 260px;min-height:42px;padding:0 14px;border:1px solid var(--border-medium);border-radius:10px;font-size:0.92rem;" />
        <select id="patients-filter-status" style="min-height:42px;padding:0 12px;border:1px solid var(--border-medium);border-radius:10px;background:#fff;">
          <option value="">Todos los estados</option>
          <option value="ADMITTED">Activos internados</option>
          <option value="DISCHARGED">Egresados</option>
          <option value="TRANSFERRED">Trasladados</option>
        </select>
        <button type="button" id="btn-patients-search" class="btn btn-secondary">Filtrar</button>
      </div>
    </div>

    <div class="card" id="patients-table-container">
      <p class="muted-sm">Cargando expedientes...</p>
    </div>
  `;

  const qInput = document.getElementById("patients-filter-q");
  const statusSelect = document.getElementById("patients-filter-status");
  const tableBox = document.getElementById("patients-table-container");

  async function loadList() {
    const params = new URLSearchParams();
    if (qInput.value.trim()) params.set("q", qInput.value.trim());
    if (statusSelect.value) params.set("status", statusSelect.value);
    try {
      const rows = await apiRequest(`/api/v1/patients?${params.toString()}`);
      if (!rows.length) {
        tableBox.innerHTML = `<p class="muted-sm">No se encontraron expedientes con esos criterios.</p>`;
        return;
      }
      tableBox.innerHTML = `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Nombre Completo</th>
                <th>CURP</th>
                <th>Estado</th>
                <th>Ingreso</th>
                <th>Familiar de Emergencia</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (p) => `
                <tr>
                  <td><span class="mono" style="font-weight:700;color:var(--blue-900);">${esc(p.folio)}</span></td>
                  <td>
                    <div style="font-weight:600;">${esc(p.first_name)} ${esc(p.last_name)}</div>
                    ${p.alert_flag ? `<span class="badge badge-gold" style="margin-top:4px;">${esc(p.alert_summary || "Alerta")}</span>` : ""}
                  </td>
                  <td class="mono muted-sm">${esc(p.curp || "—")}</td>
                  <td>${statusBadge(p.status)}</td>
                  <td class="muted-sm">${formatDateOnly(p.admission_date)}</td>
                  <td class="muted-sm">${esc(p.emergency_contact_name || "—")}<br/>${esc(p.emergency_contact_phone || "")}</td>
                  <td style="text-align:right;">
                    <a href="/angeles/expedientes/${p.id}" class="btn btn-primary btn-sm" data-link>Abrir Expediente</a>
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      tableBox.innerHTML = `<p style="color:var(--danger-600);">${esc(err.message)}</p>`;
    }
  }

  document.getElementById("btn-patients-search").addEventListener("click", loadList);
  statusSelect.addEventListener("change", loadList);
  qInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadList();
  });

  await loadList();
}

export function renderNewPatientView(container, navigate) {
  const user = getStoredUser();
  if (!canAccess(user, "admission", "write")) {
    container.innerHTML = `<div class="card"><h2>Acceso restringido (RBAC)</h2><p class="muted-sm">Solo los perfiles de Admisión y Administrador pueden registrar nuevos ingresos.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="card-header" style="margin-bottom:18px;">
      <div>
        <h1 style="font-size:1.55rem;margin-bottom:4px;color:var(--blue-950);">Registrar Nuevo Ingreso (Admisión)</h1>
        <p class="muted-sm">Al guardar se asignará automáticamente el siguiente folio institucional <span class="mono">ANG-2026-XXX</span>.</p>
      </div>
      <a href="/angeles/expedientes" class="btn btn-secondary" data-link>← Volver a Expedientes</a>
    </div>

    <form id="new-patient-form" class="card">
      <div class="form-grid">
        <div class="form-field">
          <label for="np-first">Nombre(s) *</label>
          <input type="text" id="np-first" name="first_name" required />
        </div>
        <div class="form-field">
          <label for="np-last">Apellidos *</label>
          <input type="text" id="np-last" name="last_name" required />
        </div>
        <div class="form-field">
          <label for="np-curp">CURP (18 caracteres)</label>
          <input type="text" id="np-curp" name="curp" maxlength="18" style="text-transform:uppercase;" />
        </div>
        <div class="form-field">
          <label for="np-birth">Fecha de nacimiento</label>
          <input type="date" id="np-birth" name="birth_date" />
        </div>
        <div class="form-field">
          <label for="np-gender">Género</label>
          <select id="np-gender" name="gender">
            <option value="">Seleccionar...</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="form-field">
          <label for="np-marital">Estado civil</label>
          <input type="text" id="np-marital" name="marital_status" placeholder="Soltero, Casado, Unión libre..." />
        </div>
        <div class="form-field">
          <label for="np-edu">Escolaridad</label>
          <input type="text" id="np-edu" name="education_level" />
        </div>
        <div class="form-field">
          <label for="np-occ">Ocupación</label>
          <input type="text" id="np-occ" name="occupation" />
        </div>
        <div class="form-field">
          <label for="np-phone">Teléfono de contacto</label>
          <input type="tel" id="np-phone" name="phone" />
        </div>
        <div class="form-field">
          <label for="np-discharge">Fecha estimada de egreso</label>
          <input type="date" id="np-discharge" name="planned_discharge_date" />
        </div>
        <div class="form-field full">
          <label for="np-address">Domicilio</label>
          <input type="text" id="np-address" name="address" placeholder="Calle, colonia, Irapuato, Guanajuato" />
        </div>

        <div class="form-field">
          <label for="np-em-name">Familiar responsable / Contacto de emergencia</label>
          <input type="text" id="np-em-name" name="emergency_contact_name" />
        </div>
        <div class="form-field">
          <label for="np-em-rel">Parentesco</label>
          <input type="text" id="np-em-rel" name="emergency_contact_rel" placeholder="Madre, Padre, Esposa, Hermano..." />
        </div>
        <div class="form-field">
          <label for="np-em-phone">Teléfono de emergencia</label>
          <input type="tel" id="np-em-phone" name="emergency_contact_phone" />
        </div>
        <div class="form-field">
          <label for="np-alert-summary">Alerta clínica inicial (opcional)</label>
          <input type="text" id="np-alert-summary" name="alert_summary" placeholder="Ej. Alergia o vigilancia especial" />
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:22px;">
        <a href="/angeles/expedientes" class="btn btn-secondary" data-link>Cancelar</a>
        <button type="submit" class="btn btn-primary">Crear Expediente y Continuar a Admisión</button>
      </div>
    </form>
  `;

  document.getElementById("new-patient-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {};
    for (const [k, v] of fd.entries()) {
      const trimmed = String(v).trim();
      if (trimmed !== "") payload[k] = trimmed;
    }
    if (payload.alert_summary) payload.alert_flag = true;

    try {
      const created = await apiRequest("/api/v1/patients", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast(`Expediente ${created.folio} creado correctamente.`, "success");
      navigate(`/angeles/expedientes/${created.id}`);
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}
