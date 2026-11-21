/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { apiRequest, esc, formatDateOnly, formatDateTime, getStoredUser } from "../api.js";
import { canAccess, statusBadge } from "../rbac.js";

export async function renderDashboardView(container, navigate) {
  const user = getStoredUser();
  container.innerHTML = `<div class="card"><p class="muted">Cargando indicadores clínicos en tiempo real...</p></div>`;

  try {
    const data = await apiRequest("/api/v1/dashboard/summary");
    const m = data.metrics;
    const canCreate = canAccess(user, "admission", "write");

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:20px;">
        <div>
          <h1 style="font-size:1.6rem;margin-bottom:4px;color:var(--blue-950);">Panel de Control Clínico</h1>
          <p class="muted-sm">${esc(user.institution_name)} · Sesión activa como <strong>${esc(user.full_name)}</strong> (${esc(user.role_name)})</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${canAccess(user, "admin", "full") ? `<a href="/angeles/administracion" class="btn ${m.pending_professionals > 0 ? "btn-gold" : "btn-secondary"}" data-link>Autorizar Profesionales (${m.pending_professionals || 0})</a>` : ""}
          ${canCreate ? `<a href="/angeles/expedientes/nuevo" class="btn btn-primary" data-link>+ Nuevo Ingreso</a>` : ""}
          <a href="/angeles/expedientes" class="btn btn-secondary" data-link>Ver Expedientes</a>
        </div>
      </div>

      ${
        canAccess(user, "admin", "full") && (m.pending_professionals || 0) > 0
          ? `<div class="card" style="margin-bottom:18px;background:var(--gold-100);border-color:#E7C884;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
               <div>
                 <strong style="color:var(--gold-600);">Tienes ${m.pending_professionals} solicitud(es) de registro profesional esperando tu autorización</strong>
                 <div class="muted-sm">Revisa los datos y documentos adjuntos (imágenes/PDFs) para habilitar su acceso al sistema.</div>
               </div>
               <a href="/angeles/administracion" class="btn btn-primary btn-sm" data-link>Revisar y Autorizar →</a>
             </div>`
          : ""
      }

      <section class="grid-4" style="margin-bottom:22px;">
        <div class="kpi-card">
          <div class="kpi-label">Pacientes Activos Internados</div>
          <div class="kpi-value">${m.active_patients}</div>
          <div class="kpi-sub">Total egresados históricos: ${m.discharged_total}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Ingresos del Mes</div>
          <div class="kpi-value" style="color:var(--hope-600);">${m.admissions_this_month}</div>
          <div class="kpi-sub">Expedientes con folio ANG-2026</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Egresos Programados (30d)</div>
          <div class="kpi-value" style="color:var(--blue-700);">${m.planned_discharges_30d}</div>
          <div class="kpi-sub">Seguimientos post-alta pendientes: ${m.upcoming_followups}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Alertas Clínicas Activas</div>
          <div class="kpi-value" style="color:${m.pending_alerts > 0 ? "var(--gold-600)" : "var(--hope-600)"};">${m.pending_alerts}</div>
          <div class="kpi-sub">Notas SOAP firmadas (7d): ${m.soap_notes_7d}</div>
        </div>
      </section>

      <div class="grid-2" style="align-items:start;">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Pacientes Activos Recientes</h2>
            <a href="/angeles/expedientes" class="btn btn-ghost btn-sm" data-link>Todos →</a>
          </div>
          ${
            data.active_patients.length
              ? `<div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Paciente</th>
                        <th>Egreso Est.</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.active_patients
                        .map(
                          (p) => `
                        <tr>
                          <td><span class="mono" style="font-weight:600;color:var(--blue-900);">${esc(p.folio)}</span></td>
                          <td>
                            <div style="font-weight:600;">${esc(p.full_name)}</div>
                            ${p.alert_flag ? `<span class="badge badge-gold" style="margin-top:4px;">Alerta clínica</span>` : ""}
                          </td>
                          <td class="muted-sm">${formatDateOnly(p.planned_discharge_date)}</td>
                          <td style="text-align:right;">
                            <a href="/angeles/expedientes/${p.id}" class="btn btn-secondary btn-sm" data-link>Abrir</a>
                          </td>
                        </tr>`
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>`
              : `<p class="muted-sm">No hay pacientes activos registrados actualmente.</p>`
          }
        </section>

        <div style="display:grid;gap:18px;">
          <section class="card">
            <div class="card-header">
              <h2 class="card-title">Alertas Médicas / Psicológicas</h2>
              <span class="badge ${data.alerts.length ? "badge-gold" : "badge-green"}">${data.alerts.length} pendientes</span>
            </div>
            ${
              data.alerts.length
                ? data.alerts
                    .map(
                      (a) => `
                  <div style="padding:12px;border-radius:11px;background:var(--gold-100);border:1px solid #EDD29B;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
                      <strong>${esc(a.full_name)} <span class="mono">(${esc(a.folio)})</span></strong>
                      <a href="/angeles/expedientes/${a.patient_id}" class="btn btn-secondary btn-sm" data-link>Revisar</a>
                    </div>
                    <p style="margin:6px 0 0;font-size:0.86rem;color:var(--gold-600);">${esc(a.summary)}</p>
                  </div>`
                    )
                    .join("")
                : `<p class="muted-sm">Sin alertas clínicas pendientes en este momento.</p>`
            }
          </section>

          <section class="card">
            <div class="card-header">
              <h2 class="card-title">Bitácora de Actividad Reciente</h2>
              ${canAccess(user, "admin", "full") ? `<a href="/angeles/administracion" class="btn btn-ghost btn-sm" data-link>Auditoría →</a>` : ""}
            </div>
            <div style="display:grid;gap:10px;">
              ${data.recent_activity
                .slice(0, 6)
                .map(
                  (act) => `
                <div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border-light);padding-bottom:8px;font-size:0.84rem;">
                  <div>
                    <span class="badge badge-gray" style="margin-right:6px;">${esc(act.role)}</span>
                    <strong>${esc(act.action)}</strong>
                    <div class="muted-sm">${esc(act.details || act.table_name)}</div>
                  </div>
                  <span class="muted-sm" style="white-space:nowrap;">${formatDateTime(act.created_at)}</span>
                </div>`
                )
                .join("")}
            </div>
          </section>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--danger-600);">${esc(err.message)}</p></div>`;
  }
}
