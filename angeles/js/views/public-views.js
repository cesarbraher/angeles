/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

import { getStoredUser } from "../api.js";
import { triggerAppDownloadOrInstall } from "../pwa.js";

export function renderLandingView(container) {
  const user = getStoredUser();

  container.innerHTML = `
    <section class="hero-section">
      <div>
        <div class="hero-eyebrow">Ángeles de Esperanza A.C. · Irapuato, Guanajuato</div>
        <h1 class="hero-title">Expediente Clínico Electrónico con claridad humana y trazabilidad integral.</h1>
        <p class="hero-lead">
          <strong>ÁNGELES</strong> centraliza el acompañamiento médico, psiquiátrico, psicológico, nutricional, consejería en adicciones de 12 Pasos y notas diarias SOAP con firma digital, biometría e impresión presencial.
        </p>

        <div class="hero-cta">
          <a href="${user ? "/angeles/dashboard" : "/angeles/login"}" class="btn btn-primary" data-link>
            ${user ? "Ir al Panel Clínico" : "Acceso al Sistema"}
          </a>
          ${!user ? `<a href="/angeles/registro" class="btn btn-secondary" data-link>Registro de Profesionales</a>` : ""}
          <button type="button" id="hero-btn-install" class="btn btn-download-app">
            Descargar e Instalar App
          </button>
        </div>

        <div class="card" style="padding:14px 18px;background:var(--blue-50);border-color:#CBE0F2;">
          <strong style="font-size:0.88rem;color:var(--blue-950);display:block;margin-bottom:4px;">Especialistas habilitados para registro y expediente clínico:</strong>
          <span class="muted-sm">Consejeros en Adicciones · Psicólogos · Médicos · Psiquiatras · Nutriólogos</span>
        </div>
      </div>

      <div class="hero-visual">
        <img src="/angeles/assets/hero-courtyard.jpg" alt="Espacio sereno de acompañamiento humano en Ángeles de Esperanza A.C." />
        <div class="hero-visual-caption">
          <span><strong>ÁNGELES</strong> · Plataforma Clínica Multidisciplinaria Instalable</span>
          <span class="badge badge-green">Firma Digital & Imprimible</span>
        </div>
      </div>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h2>Los 6 Módulos del Expediente Clínico Digital</h2>
        <p>Flujo multidisciplinario completo con permisos por especialidad, firmas digitales del profesional, usuario y familia, y versión imprimible para firma presencial.</p>
      </div>
      <div class="grid-3">
        <article class="card">
          <span class="badge badge-blue" style="margin-bottom:10px;">Módulo 1</span>
          <h3 class="card-title">Admisión e Ingreso</h3>
          <p class="muted-sm" style="margin-top:8px;">Ficha de identificación completa, consentimiento informado con firma digital y biométrica, e inventario de pertenencias.</p>
        </article>
        <article class="card">
          <span class="badge badge-green" style="margin-bottom:10px;">Módulo 2</span>
          <h3 class="card-title">Área Médica y Nutrición</h3>
          <p class="muted-sm" style="margin-top:8px;">Historia clínica general, alergias, signos vitales continuos (TA, FC, FR, Temp, SpO2, Glucosa), recetas, nutrición y desintoxicación.</p>
        </article>
        <article class="card">
          <span class="badge badge-blue" style="margin-bottom:10px;">Módulo 3</span>
          <h3 class="card-title">Psicología y Psiquiatría</h3>
          <p class="muted-sm" style="margin-top:8px;">Anamnesis, pruebas psicométricas, codificación diagnóstica CIE-11 / DSM-5 y plan de tratamiento individualizado.</p>
        </article>
        <article class="card">
          <span class="badge badge-gold" style="margin-bottom:10px;">Módulo 4</span>
          <h3 class="card-title">Consejería en Adicciones</h3>
          <p class="muted-sm" style="margin-top:8px;">Seguimiento estructurado paso a paso del Programa de 12 Pasos y bitácora de sesiones individuales, grupales y mentoría.</p>
        </article>
        <article class="card">
          <span class="badge badge-green" style="margin-bottom:10px;">Módulo 5 · SOAP</span>
          <h3 class="card-title">Notas de Evolución SOAP</h3>
          <p class="muted-sm" style="margin-top:8px;">Bitácora inmutable firmada digitalmente (SHA-256) con dictado asistido por IA editable y soporte de notas aclaratorias.</p>
        </article>
        <article class="card">
          <span class="badge badge-blue" style="margin-bottom:10px;">Módulo 6 + Expansión</span>
          <h3 class="card-title">Egreso y Seguimiento</h3>
          <p class="muted-sm" style="margin-top:8px;">Dictamen de alta, devolución de pertenencias, plan de prevención de recaídas, trabajo social, toxicología y seguimiento post-egreso.</p>
        </article>
      </div>
    </section>
  `;

  document.getElementById("hero-btn-install")?.addEventListener("click", () => triggerAppDownloadOrInstall());
}

export function renderServiciosView(container) {
  container.innerHTML = `
    <section>
      <div class="section-head">
        <span class="badge badge-blue" style="margin-bottom:10px;">Metodología y Cumplimiento Normativo</span>
        <h1>Alcance Clínico y Trazabilidad Documental</h1>
        <p>Diseñado bajo estándares de confidencialidad multidisciplinaria, validez documental y continuidad operativa.</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h2 class="card-title">Firma Digital, Biometría e Impresión Presencial</h2>
          <p style="color:var(--text-secondary);font-size:0.93rem;">
            Cada formato clínico incorpora al pie el nombre y firma digital del profesional responsable, así como la firma del usuario y del familiar responsable cuando corresponda, con verificación biométrica (WebAuthn / huella / Face ID) y sello SHA-256. Una vez firmado, cualquier formato puede imprimirse con líneas limpias para firma presencial.
          </p>
        </div>

        <div class="card">
          <h2 class="card-title">Registro y Validación de Especialistas</h2>
          <p style="color:var(--text-secondary);font-size:0.93rem;">
            Consejeros en Adicciones, Psicólogos, Médicos, Psiquiatras y Nutriólogos pueden inscribirse en línea adjuntando sus documentos probatorios en imagen o PDF. El acceso al sistema se habilita únicamente tras la revisión y autorización de la administración.
          </p>
        </div>

        <div class="card">
          <h2 class="card-title">Metodología SOAP Inmutable y Adendas</h2>
          <p style="color:var(--text-secondary);font-size:0.93rem;">
            Las notas diarias se registran en formato <strong>Subjetivo, Objetivo, Análisis y Plan (SOAP)</strong> con sello criptográfico vinculado a la cédula profesional. Ninguna nota firmada se borra; las aclaraciones posteriores se agregan como Adenda vinculada.
          </p>
        </div>

        <div class="card">
          <h2 class="card-title">Aplicación Web Instalable (PWA)</h2>
          <p style="color:var(--text-secondary);font-size:0.93rem;">
            Instalable directamente desde el navegador en teléfonos Android, iPhone/iPad y computadoras sin pasar por tiendas intermedias, conservando borradores locales ante interrupciones temporales de señal.
          </p>
        </div>
      </div>
    </section>
  `;
}

export function renderNosotrosView(container) {
  container.innerHTML = `
    <section>
      <div class="section-head">
        <span class="badge badge-gold" style="margin-bottom:10px;">Institución</span>
        <h1>Ángeles de Esperanza A.C.</h1>
        <p>Centro de Rehabilitación en Adicciones comprometido con la atención clínica digna, ética y multidisciplinaria en Irapuato, Guanajuato.</p>
      </div>

      <div class="grid-2">
        <div class="card card-elevated">
          <h2 class="card-title">Nuestra Institución</h2>
          <p style="color:var(--text-secondary);margin-top:10px;">
            <strong>Centro de Rehabilitación en Adicciones “ÁNGELES DE ESPERANZA A.C.”</strong><br/>
            Ubicación: Irapuato, Guanajuato, México.<br/>
            Sitio web institucional: <a href="https://angelesdeesperanzaac.org" target="_blank" rel="noopener noreferrer">angelesdeesperanzaac.org</a>
          </p>
          <p class="muted-sm">
            Brindamos acompañamiento integral en medicina, psiquiatría, psicología, nutrición, consejería en adicciones y fortalecimiento familiar.
          </p>
        </div>

        <div class="card card-elevated">
          <h2 class="card-title">Integración de Especialistas</h2>
          <p style="color:var(--text-secondary);margin-top:10px;">
            ¿Formas parte del equipo multidisciplinario como Consejero en Adicciones, Psicólogo, Médico, Psiquiatra o Nutriólogo?
          </p>
          <div style="margin-top:14px;">
            <a href="/angeles/registro" class="btn btn-primary" data-link>Ir al Registro de Profesionales</a>
          </div>
        </div>
      </div>
    </section>
  `;
}
