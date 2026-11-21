/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { apiRequest, closeModal, esc, formatDateTime, getStoredUser, openModal, showToast } from "../api.js";
import { accessLabel, canAccess } from "../rbac.js";

export async function renderAdminView(container) {
  const user = getStoredUser();
  if (!canAccess(user, "admin", "full")) {
    container.innerHTML = `<div class="card"><h2>Acceso exclusivo para Administradores</h2><p class="muted-sm">La gestión de usuarios, roles RBAC y auditoría inmutable está restringida al perfil ADMIN.</p></div>`;
    return;
  }

  container.innerHTML = `<div class="card"><p class="muted-sm">Cargando panel administrativo y auditoría...</p></div>`;

  try {
    const [usersData, auditData] = await Promise.all([
      apiRequest("/api/v1/admin/users"),
      apiRequest("/api/v1/admin/audit-logs?limit=60"),
    ]);

    const rolesOrder = ["ADMISSION", "DOCTOR", "PSYCHOLOGIST", "COUNSELOR", "SOCIAL_WORKER", "ADMIN"];
    const modOrder = ["admission", "medical", "psychology", "counseling", "soap", "discharge", "expansion", "admin"];

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h1 style="font-size:1.55rem;margin-bottom:4px;color:var(--blue-950);">Administración, RBAC y Auditoría Inmutable</h1>
          <p class="muted-sm">Control de credenciales profesionales, matriz de permisos y trazabilidad normativa (<code>audit_logs</code>).</p>
        </div>
        <button type="button" id="btn-create-user" class="btn btn-primary btn-sm">+ Nuevo Usuario del Personal</button>
      </div>

      <!-- Usuarios -->
      <section class="card" style="margin-bottom:20px;">
        <div class="card-header">
          <h2 class="card-title">Personal Autorizado (${usersData.users.length})</h2>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Nombre / Especialidad</th><th>Usuario / Correo</th><th>Rol RBAC</th><th>Cédula Prof.</th><th>Último Acceso</th><th>Estado</th></tr></thead>
            <tbody>
              ${usersData.users
                .map(
                  (u) => `
                <tr>
                  <td><strong>${esc(u.full_name)}</strong><div class="muted-sm">${esc(u.specialty || "—")}</div></td>
                  <td><span class="mono">${esc(u.username)}</span><div class="muted-sm">${esc(u.email)}</div></td>
                  <td><span class="badge badge-blue">${esc(u.role_code)}</span></td>
                  <td class="mono muted-sm">${esc(u.professional_license || "—")}</td>
                  <td class="muted-sm">${formatDateTime(u.last_login_at)}</td>
                  <td><span class="badge ${u.is_active ? "badge-green" : "badge-red"}">${u.is_active ? "Activo" : "Inactivo"}</span></td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Matriz RBAC -->
      <section class="card" style="margin-bottom:20px;">
        <div class="card-header">
          <h2 class="card-title">Matriz Activa de Control de Acceso (RBAC)</h2>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Módulo</th>
                ${rolesOrder.map((r) => `<th>${r}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${modOrder
                .map(
                  (m) => `
                <tr>
                  <td><strong style="text-transform:capitalize;">${m}</strong></td>
                  ${rolesOrder
                    .map((r) => {
                      const lvl = usersData.rbac_matrix[r]?.[m] || "none";
                      const cls = lvl === "full" ? "badge-green" : lvl === "write" ? "badge-blue" : lvl === "read" ? "badge-gold" : "badge-gray";
                      return `<td><span class="badge ${cls}">${accessLabel(lvl)}</span></td>`;
                    })
                    .join("")}
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Auditoría Inmutable -->
      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Bitácora de Auditoría Inmutable (audit_logs)</h2>
            <p class="muted-sm">Protegida contra modificación o borrado por normativa clínica.</p>
          </div>
          <span class="badge badge-green">${auditData.count} eventos recientes</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Fecha / Hora</th><th>Rol</th><th>Acción</th><th>Tabla / Registro</th><th>Detalle</th><th>IP</th></tr></thead>
            <tbody>
              ${auditData.logs
                .map(
                  (l) => `
                <tr>
                  <td class="muted-sm" style="white-space:nowrap;">${formatDateTime(l.created_at)}</td>
                  <td><span class="badge badge-gray">${esc(l.role)}</span></td>
                  <td><strong class="mono">${esc(l.action)}</strong></td>
                  <td class="mono muted-sm">${esc(l.table_name)} #${esc(l.record_id || "—")}</td>
                  <td class="muted-sm">${esc(l.details || "—")}</td>
                  <td class="mono muted-sm">${esc(l.ip_address || "—")}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;

    document.getElementById("btn-create-user")?.addEventListener("click", () => {
      openModal(
        "Registrar Nuevo Profesional",
        `
        <form id="modal-new-user" class="form-grid">
          <div class="form-field full"><label>Nombre completo *</label><input name="full_name" required /></div>
          <div class="form-field"><label>Usuario *</label><input name="username" required /></div>
          <div class="form-field"><label>Correo electrónico *</label><input type="email" name="email" required /></div>
          <div class="form-field">
            <label>Rol RBAC *</label>
            <select name="role_code">
              <option value="DOCTOR">Médico (DOCTOR)</option>
              <option value="PSYCHOLOGIST">Psicólogo / Psiquiatra (PSYCHOLOGIST)</option>
              <option value="COUNSELOR">Consejero 12 Pasos (COUNSELOR)</option>
              <option value="ADMISSION">Admisión (ADMISSION)</option>
              <option value="SOCIAL_WORKER">Trabajo Social (SOCIAL_WORKER)</option>
              <option value="ADMIN">Administrador (ADMIN)</option>
            </select>
          </div>
          <div class="form-field"><label>Cédula Profesional</label><input name="professional_license" /></div>
          <div class="form-field full"><label>Especialidad</label><input name="specialty" /></div>
          <div class="form-field full"><label>Contraseña inicial (mín. 8 caracteres) *</label><input type="password" name="password" minlength="8" required /></div>
          <div class="form-field full"><button type="submit" class="btn btn-primary">Crear Cuenta</button></div>
        </form>`
      );
      document.getElementById("modal-new-user").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await apiRequest("/api/v1/admin/users", {
            method: "POST",
            body: JSON.stringify({
              full_name: fd.get("full_name"),
              username: fd.get("username"),
              email: fd.get("email"),
              role_code: fd.get("role_code"),
              professional_license: fd.get("professional_license") || null,
              specialty: fd.get("specialty") || null,
              password: fd.get("password"),
            }),
          });
          closeModal();
          showToast("Usuario profesional registrado correctamente.", "success");
          renderAdminView(container);
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--danger-600);">${esc(err.message)}</p></div>`;
  }
}
