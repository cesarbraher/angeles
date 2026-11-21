/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { apiRequest, esc, showToast } from "../api.js";
import { CapacitiveSignaturePad } from "../signature-pad.js";

const PROFESSIONAL_ROLES = [
  { code: "COUNSELOR", label: "Consejero en Adicciones" },
  { code: "PSYCHOLOGIST", label: "Psicólogo" },
  { code: "DOCTOR", label: "Médico" },
  { code: "PSYCHIATRIST", label: "Psiquiatra" },
  { code: "NUTRITIONIST", label: "Nutriólogo" },
];

const DOC_TYPES = [
  "Cédula Profesional",
  "Título Profesional",
  "Certificación CONADIC / Especialidad",
  "Identificación Oficial (INE / Pasaporte)",
  "Constancia / Diploma / Currículum",
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function renderProfessionalRegisterView(container, navigate) {
  const attachedDocs = [];

  container.innerHTML = `
    <div style="max-width:860px;margin:0 auto;">
      <div class="card-header" style="margin-bottom:18px;">
        <div>
          <span class="badge badge-blue" style="margin-bottom:8px;">Inscripción de Especialistas</span>
          <h1 style="font-size:1.65rem;margin-bottom:4px;color:var(--blue-950);">Registro de Profesionales Clínicos</h1>
          <p class="muted-sm">Dirigido a Consejeros en Adicciones, Psicólogos, Médicos, Psiquiatras y Nutriólogos. Tu solicitud será revisada y autorizada por la administración de <strong>ÁNGELES DE ESPERANZA</strong>.</p>
        </div>
        <a href="/angeles/login" class="btn btn-secondary btn-sm" data-link>Ya tengo cuenta →</a>
      </div>

      <form id="prof-register-form" class="card card-elevated">
        <h2 class="card-title" style="margin-bottom:12px;">1. Datos Personales y de Contacto</h2>
        <div class="form-grid">
          <div class="form-field full">
            <label for="reg-fullname">Nombre completo *</label>
            <input type="text" id="reg-fullname" name="full_name" required placeholder="Nombre(s) y apellidos completos" />
          </div>
          <div class="form-field">
            <label for="reg-curp">CURP</label>
            <input type="text" id="reg-curp" name="curp" maxlength="18" style="text-transform:uppercase;" placeholder="18 caracteres" />
          </div>
          <div class="form-field">
            <label for="reg-rfc">RFC</label>
            <input type="text" id="reg-rfc" name="rfc" maxlength="13" style="text-transform:uppercase;" placeholder="13 caracteres" />
          </div>
          <div class="form-field">
            <label for="reg-birth">Fecha de nacimiento</label>
            <input type="date" id="reg-birth" name="birth_date" />
          </div>
          <div class="form-field">
            <label for="reg-phone">Teléfono / WhatsApp *</label>
            <input type="tel" id="reg-phone" name="phone" required placeholder="Ej. 462-123-4567" />
          </div>
          <div class="form-field">
            <label for="reg-email">Correo electrónico *</label>
            <input type="email" id="reg-email" name="email" required placeholder="correo@ejemplo.com" />
          </div>
          <div class="form-field">
            <label for="reg-address">Domicilio / Ciudad y Estado</label>
            <input type="text" id="reg-address" name="address" placeholder="Calle, colonia, Irapuato, Guanajuato" />
          </div>
        </div>

        <h2 class="card-title" style="margin:24px 0 12px;">2. Datos Profesionales y Credenciales</h2>
        <div class="form-grid">
          <div class="form-field">
            <label for="reg-role">Profesión / Área Clínica *</label>
            <select id="reg-role" name="role_code" required>
              <option value="">Seleccionar profesión...</option>
              ${PROFESSIONAL_ROLES.map((r) => `<option value="${r.code}">${esc(r.label)}</option>`).join("")}
            </select>
          </div>
          <div class="form-field">
            <label for="reg-license">Cédula Profesional / Certificación *</label>
            <input type="text" id="reg-license" name="professional_license" required placeholder="Número de cédula o registro CONADIC" />
          </div>
          <div class="form-field">
            <label for="reg-specialty">Especialidad / Subespecialidad</label>
            <input type="text" id="reg-specialty" name="specialty" placeholder="Ej. Adicciones, Psicología Clínica, Nutrición Clínica" />
          </div>
          <div class="form-field">
            <label for="reg-univ">Universidad / Institución que expide título</label>
            <input type="text" id="reg-univ" name="university" placeholder="Nombre de la universidad o institución" />
          </div>
          <div class="form-field">
            <label for="reg-grad">Año de titulación / certificación</label>
            <input type="number" id="reg-grad" name="graduation_year" min="1950" max="2035" placeholder="Ej. 2019" />
          </div>
          <div class="form-field">
            <label for="reg-exp">Años de experiencia clínica</label>
            <input type="number" id="reg-exp" name="experience_years" min="0" max="70" placeholder="Ej. 5" />
          </div>
          <div class="form-field full">
            <label for="reg-bio">Resumen curricular y enfoque terapéutico</label>
            <textarea id="reg-bio" name="bio" placeholder="Breve descripción de tu formación, experiencia en rehabilitación y áreas de atención"></textarea>
          </div>
        </div>

        <h2 class="card-title" style="margin:24px 0 8px;">3. Documentos Probatorios (Imágenes o PDFs) *</h2>
        <p class="muted-sm" style="margin-bottom:12px;">
          Adjunta imágenes (JPG, PNG, WEBP) o archivos PDF que avalen tu profesión (Título, Cédula Profesional, Certificación CONADIC, Identificación Oficial). Máximo 2 MB por archivo.
        </p>

        <div class="card" style="background:var(--blue-50);border-color:#CBE0F2;margin-bottom:16px;">
          <div class="form-grid" style="align-items:end;">
            <div class="form-field">
              <label for="reg-doc-type">Tipo de documento a adjuntar</label>
              <select id="reg-doc-type">
                ${DOC_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
              </select>
            </div>
            <div class="form-field">
              <label for="reg-doc-files">Seleccionar imagen o PDF</label>
              <input type="file" id="reg-doc-files" accept=".pdf,image/png,image/jpeg,image/webp" multiple style="padding:8px;" />
            </div>
          </div>
          <div id="reg-docs-list" style="margin-top:12px;"></div>
        </div>

        <h2 class="card-title" style="margin:24px 0 8px;">4. Firma Autógrafa Digital del Profesional</h2>
        <div class="signature-box" style="margin-bottom:18px;">
          <div class="muted-sm" style="margin-bottom:6px;">Registra tu firma digital para utilizarla en los formatos clínicos que emitas:</div>
          <canvas id="reg-signature-canvas" class="signature-canvas" style="height:140px;"></canvas>
          <div class="signature-toolbar">
            <span class="muted-sm">Firma con el dedo, stylus o mouse</span>
            <button type="button" id="reg-clear-sig" class="btn btn-secondary btn-sm">Limpiar Firma</button>
          </div>
        </div>

        <h2 class="card-title" style="margin:24px 0 12px;">5. Credenciales de Acceso al Sistema</h2>
        <div class="form-grid">
          <div class="form-field">
            <label for="reg-user">Nombre de usuario deseado *</label>
            <input type="text" id="reg-user" name="username" required minlength="3" placeholder="Ej. dr.garcia" />
          </div>
          <div class="form-field">
            <label for="reg-pw">Contraseña (mín. 6 caracteres) *</label>
            <input type="password" id="reg-pw" name="password" required minlength="6" />
          </div>
          <div class="form-field">
            <label for="reg-pw2">Confirmar contraseña *</label>
            <input type="password" id="reg-pw2" required minlength="6" />
          </div>
        </div>

        <div id="reg-error" class="badge badge-red hidden" style="margin-top:16px;padding:10px 14px;border-radius:10px;width:100%;justify-content:center;"></div>

        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:22px;flex-wrap:wrap;">
          <a href="/angeles/login" class="btn btn-secondary" data-link>Cancelar</a>
          <button type="submit" id="btn-submit-reg" class="btn btn-primary">Enviar Registro para Autorización</button>
        </div>
      </form>
    </div>
  `;

  const sigCanvas = document.getElementById("reg-signature-canvas");
  const sigPad = sigCanvas ? new CapacitiveSignaturePad(sigCanvas) : null;
  document.getElementById("reg-clear-sig")?.addEventListener("click", () => sigPad?.clear());

  const fileInput = document.getElementById("reg-doc-files");
  const docTypeSel = document.getElementById("reg-doc-type");
  const docsListEl = document.getElementById("reg-docs-list");

  function renderDocsList() {
    if (!attachedDocs.length) {
      docsListEl.innerHTML = `<p class="muted-sm">Aún no has adjuntado documentos probatorios.</p>`;
      return;
    }
    docsListEl.innerHTML = `
      <div style="display:grid;gap:8px;">
        ${attachedDocs
          .map(
            (d, idx) => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:1px solid var(--border-light);border-radius:10px;padding:10px 12px;">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
              ${
                d.mime_type.startsWith("image/")
                  ? `<img src="${d.data_url}" alt="${esc(d.file_name)}" style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid var(--border-light);" />`
                  : `<span class="badge badge-blue">PDF</span>`
              }
              <div style="min-width:0;">
                <div style="font-weight:600;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;">${esc(d.file_name)}</div>
                <div class="muted-sm">${esc(d.doc_type)} · ${(d.size_bytes / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" data-rm-doc="${idx}">Quitar</button>
          </div>`
          )
          .join("")}
      </div>
    `;
    docsListEl.querySelectorAll("[data-rm-doc]").forEach((b) => {
      b.addEventListener("click", () => {
        attachedDocs.splice(Number(b.getAttribute("data-rm-doc")), 1);
        renderDocsList();
      });
    });
  }
  renderDocsList();

  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []);
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) {
        showToast(`El archivo "${file.name}" supera 2 MB. Comprímelo antes de adjuntar.`, "error");
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        attachedDocs.push({
          file_name: file.name,
          doc_type: docTypeSel.value,
          mime_type: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          size_bytes: file.size,
          data_url: dataUrl,
        });
      } catch (err) {
        showToast(err.message, "error");
      }
    }
    fileInput.value = "";
    renderDocsList();
  });

  const form = document.getElementById("prof-register-form");
  const errBox = document.getElementById("reg-error");
  const submitBtn = document.getElementById("btn-submit-reg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.classList.add("hidden");

    const pw1 = document.getElementById("reg-pw").value;
    const pw2 = document.getElementById("reg-pw2").value;
    if (pw1 !== pw2) {
      errBox.textContent = "Las contraseñas no coinciden.";
      errBox.classList.remove("hidden");
      return;
    }
    if (!attachedDocs.length) {
      errBox.textContent = "Adjunta al menos un documento (imagen o PDF) que avale tu profesión.";
      errBox.classList.remove("hidden");
      return;
    }

    const fd = new FormData(form);
    const payload = {
      full_name: fd.get("full_name"),
      role_code: fd.get("role_code"),
      username: fd.get("username"),
      email: fd.get("email"),
      password: pw1,
      curp: fd.get("curp") || null,
      rfc: fd.get("rfc") || null,
      birth_date: fd.get("birth_date") || null,
      phone: fd.get("phone"),
      address: fd.get("address") || null,
      professional_license: fd.get("professional_license"),
      specialty: fd.get("specialty") || null,
      university: fd.get("university") || null,
      graduation_year: fd.get("graduation_year") ? Number(fd.get("graduation_year")) : null,
      experience_years: fd.get("experience_years") ? Number(fd.get("experience_years")) : null,
      bio: fd.get("bio") || null,
      default_signature_data: sigPad ? sigPad.toDataURL() : null,
      documents: attachedDocs,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando registro y documentos...";
    try {
      const res = await apiRequest("/api/v1/auth/register-professional", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      container.innerHTML = `
        <div class="auth-wrap" style="max-width:560px;">
          <div class="card card-elevated" style="text-align:center;">
            <span class="badge badge-green" style="margin-bottom:12px;">Solicitud Recibida</span>
            <h1 style="font-size:1.5rem;color:var(--blue-950);margin-bottom:10px;">Registro Enviado para Autorización</h1>
            <p style="color:var(--text-secondary);">${esc(res.message)}</p>
            <div style="background:var(--bg-canvas);border:1px solid var(--border-light);border-radius:12px;padding:14px;margin:18px 0;text-align:left;font-size:0.88rem;">
              <div><strong>Usuario:</strong> <span class="mono">${esc(res.username)}</span></div>
              <div><strong>Perfil solicitado:</strong> ${esc(res.role_name)}</div>
              <div><strong>Documentos adjuntos:</strong> ${res.documents_count} archivo(s)</div>
              <div><strong>Estado:</strong> <span class="badge badge-gold">Pendiente de autorización</span></div>
            </div>
            <a href="/angeles/login" class="btn btn-primary" data-link>Ir a Iniciar Sesión</a>
          </div>
        </div>
      `;
      showToast("Solicitud enviada correctamente.", "success");
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar Registro para Autorización";
    }
  });
}
