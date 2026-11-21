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

function approvalBadge(st) {
  if (st === "PENDING") return `<span class="badge badge-gold">Pendiente de autorización</span>`;
  if (st === "APPROVED") return `<span class="badge badge-green">Autorizado</span>`;
  if (st === "REJECTED") return `<span class="badge badge-red">Rechazado</span>`;
  return `<span class="badge badge-gray">${esc(st || "—")}</span>`;
}

function previewDocumentModal(doc) {
  const isImg = (doc.mime_type || "").startsWith("image/");
  const isPdf = (doc.mime_type || "").includes("pdf") || (doc.file_name || "").toLowerCase().endsWith(".pdf");

  let viewer = `<p class="muted-sm">Vista previa no disponible para este formato; puedes descargarlo directamente.</p>`;
  if (isImg) {
    viewer = `<img src="${doc.data_url}" alt="${esc(doc.file_name)}" style="max-width:100%;max-height:62vh;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border-light);" />`;
  } else if (isPdf) {
    viewer = `<iframe src="${doc.data_url}" title="${esc(doc.file_name)}" style="width:100%;height:62vh;border:1px solid var(--border-light);border-radius:10px;"></iframe>`;
  }

  openModal(
    `Documento: ${doc.doc_type || doc.file_name}`,
    `
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <span class="muted-sm">${esc(doc.file_name)} (${((doc.size_bytes || 0) / 1024).toFixed(1)} KB)</span>
        <a href="${doc.data_url}" download="${esc(doc.file_name)}" class="btn btn-primary btn-sm">Descargar Archivo</a>
      </div>
      ${viewer}
    `
  );
}

export async function renderAdminView(container) {
  const user = getStoredUser();
  if (!canAccess(user, "admin", "full")) {
    container.innerHTML = `<div class="card"><h2>Acceso exclusivo para la cuenta Master</h2><p class="muted-sm">La revisión de solicitudes de profesionales, gestión de permisos y auditoría está restringida a la administración Master.</p></div>`;
    return;
  }

  container.innerHTML = `<div class="card"><p class="muted-sm">Cargando panel Master, solicitudes de profesionales y auditoría...</p></div>`;

  try {
    const [usersData, profData, auditData] = await Promise.all([
      apiRequest("/api/v1/admin/users"),
      apiRequest("/api/v1/admin/professionals"),
      apiRequest("/api/v1/admin/audit-logs?limit=60"),
    ]);

    const rolesOrder = ["DOCTOR", "PSYCHIATRIST", "PSYCHOLOGIST", "COUNSELOR", "NUTRITIONIST", "ADMIN"];
    const modOrder = ["admission", "medical", "psychology", "counseling", "soap", "discharge", "expansion", "admin"];
    let profFilter = "PENDING";

    container.innerHTML = `
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <h1 style="font-size:1.55rem;margin-bottom:4px;color:var(--blue-950);">Panel Master — Autorización de Profesionales y Control Total</h1>
          <p class="muted-sm">Revisa documentación probatoria (imágenes y PDFs), autoriza el ingreso de especialistas y consulta la bitácora inmutable.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="btn-create-user" class="btn btn-primary btn-sm">+ Alta Directa de Profesional</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.print()">Imprimir Reporte</button>
        </div>
      </div>

      <!-- SECCIÓN PRINCIPAL: SOLICITUDES DE PROFESIONALES POR AUTORIZAR -->
      <section class="card card-elevated" style="margin-bottom:22px;border-color:${profData.pending_count > 0 ? "#E6C782" : "var(--border-light)"};">
        <div class="card-header">
          <div>
            <h2 class="card-title">Registros de Profesionales e Inscripciones</h2>
            <p class="muted-sm">Verifica identidad, cédula y documentos adjuntos antes de autorizar acceso a expedientes.</p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;" id="prof-filter-bar">
            <button type="button" class="btn btn-primary btn-sm" data-pfilter="PENDING">Por autorizar (${profData.pending_count})</button>
            <button type="button" class="btn btn-secondary btn-sm" data-pfilter="APPROVED">Autorizados</button>
            <button type="button" class="btn btn-secondary btn-sm" data-pfilter="REJECTED">Rechazados</button>
            <button type="button" class="btn btn-secondary btn-sm" data-pfilter="ALL">Todos (${profData.count})</button>
          </div>
        </div>
        <div id="professionals-review-list"></div>
      </section>

      <!-- PERSONAL REGISTRADO -->
      <section class="card" style="margin-bottom:20px;">
        <div class="card-header">
          <h2 class="card-title">Directorio General de Cuentas (${usersData.users.length})</h2>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Nombre / Especialidad</th><th>Usuario / Correo</th><th>Perfil</th><th>Cédula</th><th>Estado</th><th>Último Acceso</th></tr></thead>
            <tbody>
              ${usersData.users
                .map(
                  (u) => `
                <tr>
                  <td><strong>${esc(u.full_name)}</strong><div class="muted-sm">${esc(u.specialty || "—")}</div></td>
                  <td><span class="mono">${esc(u.username)}</span><div class="muted-sm">${esc(u.email)}</div></td>
                  <td><span class="badge badge-blue">${esc(u.role_name || u.role_code)}</span></td>
                  <td class="mono muted-sm">${esc(u.professional_license || "—")}</td>
                  <td>${approvalBadge(u.approval_status)}</td>
                  <td class="muted-sm">${formatDateTime(u.last_login_at)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <!-- MATRIZ RBAC -->
      <section class="card" style="margin-bottom:20px;">
        <div class="card-header">
          <h2 class="card-title">Matriz de Permisos por Especialidad (RBAC)</h2>
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

      <!-- AUDITORÍA INMUTABLE -->
      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Bitácora de Auditoría Inmutable (audit_logs)</h2>
            <p class="muted-sm">Trazabilidad normativa de accesos, autorizaciones y firmas clínicas.</p>
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

    const reviewEl = document.getElementById("professionals-review-list");

    function renderProfessionalsList() {
      const list = profData.professionals.filter((p) => profFilter === "ALL" || p.approval_status === profFilter);
      if (!list.length) {
        reviewEl.innerHTML = `<p class="muted-sm">No hay registros de profesionales en esta categoría.</p>`;
        return;
      }

      reviewEl.innerHTML = list
        .map(
          (p) => `
        <article class="card" style="margin-bottom:14px;background:var(--bg-canvas);">
          <div class="card-header" style="margin-bottom:10px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong style="font-size:1.05rem;">${esc(p.full_name)}</strong>
                <span class="badge badge-blue">${esc(p.role_name || p.role_code)}</span>
                ${approvalBadge(p.approval_status)}
              </div>
              <div class="muted-sm" style="margin-top:4px;">
                Usuario: <span class="mono">${esc(p.username)}</span> · Correo: ${esc(p.email)} · Tel: ${esc(p.phone || "—")} · Inscrito: ${formatDateTime(p.created_at)}
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${
                p.approval_status !== "APPROVED"
                  ? `<button type="button" class="btn btn-primary btn-sm" data-approve-id="${p.id}">✓ Autorizar Registro</button>`
                  : ""
              }
              ${
                p.approval_status !== "REJECTED"
                  ? `<button type="button" class="btn btn-danger-outline btn-sm" data-reject-id="${p.id}">Rechazar / Suspender</button>`
                  : ""
              }
            </div>
          </div>

          <div class="grid-3" style="font-size:0.85rem;margin-bottom:10px;background:#fff;padding:12px;border-radius:10px;border:1px solid var(--border-light);">
            <div><strong>Cédula / Cert.:</strong> <span class="mono">${esc(p.professional_license || "—")}</span></div>
            <div><strong>Especialidad:</strong> ${esc(p.specialty || "—")}</div>
            <div><strong>Universidad:</strong> ${esc(p.university || "—")} ${p.graduation_year ? `(${p.graduation_year})` : ""}</div>
            <div><strong>CURP / RFC:</strong> <span class="mono">${esc(p.curp || "—")}</span> / <span class="mono">${esc(p.rfc || "—")}</span></div>
            <div><strong>Experiencia:</strong> ${p.experience_years != null ? `${p.experience_years} años` : "—"}</div>
            <div><strong>Domicilio:</strong> ${esc(p.address || "—")}</div>
          </div>

          ${p.bio ? `<p class="muted-sm" style="margin-bottom:10px;"><strong>Resumen curricular:</strong> ${esc(p.bio)}</p>` : ""}
          ${p.rejection_reason ? `<p style="color:var(--danger-600);font-size:0.85rem;margin-bottom:10px;"><strong>Motivo de rechazo:</strong> ${esc(p.rejection_reason)}</p>` : ""}

          ${
            p.default_signature_data
              ? `<div style="margin-bottom:10px;">
                   <span class="muted-sm" style="display:block;margin-bottom:4px;">Firma autógrafa registrada:</span>
                   <img src="${p.default_signature_data}" alt="Firma del profesional" style="max-height:68px;background:#fff;border:1px solid var(--border-light);border-radius:8px;padding:4px;" />
                 </div>`
              : ""
          }

          <div>
            <strong style="font-size:0.84rem;display:block;margin-bottom:6px;">Documentos Probatorios Adjuntos (${(p.documents_json || []).length}):</strong>
            ${
              (p.documents_json || []).length
                ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
                     ${p.documents_json
                       .map(
                         (d, idx) => `
                       <button type="button" class="btn btn-secondary btn-sm" data-view-doc="${p.id}:${idx}">
                         ${(d.mime_type || "").includes("pdf") ? "PDF" : "IMG"} · ${esc(d.doc_type || d.file_name)}
                       </button>`
                       )
                       .join("")}
                   </div>`
                : `<span class="muted-sm">Sin archivos adjuntos.</span>`
            }
          </div>
        </article>`
        )
        .join("");

      // Ver documento adjunto
      reviewEl.querySelectorAll("[data-view-doc]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [pid, idx] = btn.getAttribute("data-view-doc").split(":").map(Number);
          const prof = profData.professionals.find((x) => x.id === pid);
          const doc = prof?.documents_json?.[idx];
          if (doc) previewDocumentModal(doc);
        });
      });

      // Autorizar profesional
      reviewEl.querySelectorAll("[data-approve-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const pid = btn.getAttribute("data-approve-id");
          try {
            const res = await apiRequest(`/api/v1/admin/professionals/${pid}/approve`, { method: "POST" });
            showToast(`Profesional ${res.full_name} autorizado. Ya puede iniciar sesión.`, "success");
            renderAdminView(container);
          } catch (err) {
            showToast(err.message, "error");
          }
        });
      });

      // Rechazar profesional
      reviewEl.querySelectorAll("[data-reject-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const pid = btn.getAttribute("data-reject-id");
          openModal(
            "Rechazar / Suspender Registro Profesional",
            `
            <form id="modal-reject-form" class="form-grid" style="grid-template-columns:1fr;">
              <div class="form-field">
                <label>Motivo del rechazo o solicitud de corrección</label>
                <textarea name="reason" required placeholder="Ej. Falta adjuntar cédula profesional legible o documento vigente."></textarea>
              </div>
              <button type="submit" class="btn btn-danger-outline">Confirmar Rechazo</button>
            </form>`
          );
          document.getElementById("modal-reject-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
              await apiRequest(`/api/v1/admin/professionals/${pid}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason: fd.get("reason") }),
              });
              closeModal();
              showToast("Solicitud rechazada y registrada en auditoría.", "info");
              renderAdminView(container);
            } catch (err) {
              showToast(err.message, "error");
            }
          });
        });
      });
    }

    document.querySelectorAll("[data-pfilter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        profFilter = btn.getAttribute("data-pfilter");
        document.querySelectorAll("[data-pfilter]").forEach((b) => {
          b.className = b === btn ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm";
        });
        renderProfessionalsList();
      });
    });

    renderProfessionalsList();

    document.getElementById("btn-create-user")?.addEventListener("click", () => {
      openModal(
        "Alta Directa de Profesional",
        `
        <form id="modal-new-user" class="form-grid">
          <div class="form-field full"><label>Nombre completo *</label><input name="full_name" required /></div>
          <div class="form-field"><label>Usuario *</label><input name="username" required /></div>
          <div class="form-field"><label>Correo electrónico *</label><input type="email" name="email" required /></div>
          <div class="form-field">
            <label>Especialidad / Perfil *</label>
            <select name="role_code">
              <option value="COUNSELOR">Consejero en Adicciones</option>
              <option value="PSYCHOLOGIST">Psicólogo</option>
              <option value="DOCTOR">Médico</option>
              <option value="PSYCHIATRIST">Psiquiatra</option>
              <option value="NUTRITIONIST">Nutriólogo</option>
              <option value="ADMIN">Administrador Master</option>
            </select>
          </div>
          <div class="form-field"><label>Cédula Profesional / Certificación</label><input name="professional_license" /></div>
          <div class="form-field full"><label>Especialidad</label><input name="specialty" /></div>
          <div class="form-field full"><label>Contraseña *</label><input type="password" name="password" minlength="4" required /></div>
          <div class="form-field full"><button type="submit" class="btn btn-primary">Crear y Autorizar Cuenta</button></div>
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
          showToast("Profesional creado y autorizado.", "success");
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
