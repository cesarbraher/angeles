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

export function renderLandingView(container, navigate) {
  const user = getStoredUser();

  container.innerHTML = `
    <section class="hero-section">
      <div>
        <div class="hero-eyebrow">Ángeles de Esperanza A.C. · Irapuato, Guanajuato</div>
        <h1 class="hero-title">Expediente Clínico Electrónico con claridad humana y trazabilidad integral.</h1>
        <p class="hero-lead">
          <strong>ÁNGELES</strong> centraliza el acompañamiento médico, psicológico, consejería de 12 Pasos, notas diarias SOAP asistidas por IA y seguimiento post-egreso en una aplicación web instalable desde cualquier dispositivo.
        </p>

        <div class="hero-cta">
          <a href="${user ? "/angeles/dashboard" : "/angeles/login"}" class="btn btn-primary" data-link>
            ${user ? "Ir al Panel Clínico" : "Acceso al Personal Clínico"}
          </a>
          <button type="button" id="hero-btn-install" class="btn btn-download-app">
            Descargar e Instalar App
          </button>
          <a href="/angeles/servicios" class="btn btn-secondary" data-link>
            Conocer Metodología
          </a>
        </div>

        <blockquote class="hero-quote">
          <p>“Toda gran obra comienza siendo invisible. Mi labor consiste en darle forma.”</p>
          <cite>— César Augusto Bravo Hernández · CESAR A. BRAVO - DevRel @Google</cite>
        </blockquote>
      </div>

      <div class="hero-visual">
        <img src="/angeles/assets/hero-courtyard.jpg" alt="Patio sereno y luminoso de acompañamiento humano en Ángeles de Esperanza A.C." />
        <div class="hero-visual-caption">
          <span><strong>Fase Beta 1.0</strong> · Arquitectura PWA Instalable + MySQL / FastAPI</span>
          <span class="badge badge-green">HTTPS & Offline Ready</span>
        </div>
      </div>
    </section>

    <section class="section-block">
      <div class="section-head">
        <h2>Los 6 Módulos del Expediente Clínico Digital</h2>
        <p>Flujo multidisciplinario completo con permisos estrictos por rol profesional (RBAC) y firma electrónica SHA-256.</p>
      </div>
      <div class="grid-3">
        <article class="card">
          <span class="badge badge-blue" style="margin-bottom:10px;">Módulo 1</span>
          <h3 class="card-title">Admisión e Ingreso</h3>
          <p class="muted-sm" style="margin-top:8px;">Ficha de identificación completa, consentimiento informado digital con pad de firma táctil capacitiva y resguardo de pertenencias.</p>
        </article>
        <article class="card">
          <span class="badge badge-green" style="margin-bottom:10px;">Módulo 2</span>
          <h3 class="card-title">Área Médica</h3>
          <p class="muted-sm" style="margin-top:8px;">Historia clínica general, alergias, monitoreo continuo de signos vitales (TA, FC, FR, Temp, SpO2, Glucosa), recetas y desintoxicación.</p>
        </article>
        <article class="card">
          <span class="badge badge-blue" style="margin-bottom:10px;">Módulo 3</span>
          <h3 class="card-title">Psicología y Psiquiatría</h3>
          <p class="muted-sm" style="margin-top:8px;">Anamnesis, pruebas psicométricas, codificación diagnóstica CIE-11 / DSM-5 y plan de tratamiento individualizado.</p>
        </article>
        <article class="card">
          <span class="badge badge-gold" style="margin-bottom:10px;">Módulo 4</span>
          <h3 class="card-title">Consejería y 12 Pasos</h3>
          <p class="muted-sm" style="margin-top:8px;">Seguimiento estructurado paso a paso del Programa de 12 Pasos y bitácora de sesiones individuales, grupales y mentoría.</p>
        </article>
        <article class="card">
          <span class="badge badge-green" style="margin-bottom:10px;">Módulo 5 · IA Gemini</span>
          <h3 class="card-title">Notas de Evolución SOAP</h3>
          <p class="muted-sm" style="margin-top:8px;">Bitácora inmutable firmada con SHA-256 y asistente de dictado clínico con Google Gemini (borrador siempre editable por el profesional).</p>
        </article>
        <article class="card">
          <span class="badge badge-blue" style="margin-bottom:10px;">Módulo 6 + Expansión</span>
          <h3 class="card-title">Egreso y Seguimiento</h3>
          <p class="muted-sm" style="margin-top:8px;">Dictamen de alta, devolución de pertenencias, plan de prevención de recaídas, trabajo social, toxicología y llamadas a 1, 3, 6 y 12 meses.</p>
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
        <h1>Alcance Clínico y Arquitectura de Trazabilidad</h1>
        <p>Diseñado bajo estándares de seguridad clínica, confidencialidad multidisciplinaria y continuidad operativa en campo.</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h2 class="card-title">Metodología SOAP Inmutable + Adendas</h2>
          <p style="color:var(--text-secondary);font-size:0.93rem;">
            Cada nota diaria se estructura en <strong>Subjetivo (S)</strong>, <strong>Objetivo (O)</strong>, <strong>Análisis (A)</strong> y <strong>Plan (P)</strong>. Al firmarse genera un sello criptográfico <code>SHA-256</code> vinculado a la cédula profesional del autor y la marca temporal exacta. Ningún registro firmado puede eliminarse; las precisiones posteriores se adjuntan como <em>Nota Aclaratoria / Adenda</em>.
          </p>
        </div>

        <div class="card">
          <h2 class="card-title">Asistente Clínico con Google Gemini</h2>
          <p style="color:var(--text-secondary);font-size:0.93rem;">
            El personal clínico puede escribir o dictar por voz observaciones en lenguaje natural y estructurarlas en segundos en un borrador SOAP mediante el endpoint <code>/api/v1/ai/assist-soap</code>. Por regla estricta de seguridad, la IA nunca diagnostica ni guarda automáticamente: el profesional siempre revisa y firma.
          </p>
        </div>

        <div class="card">
          <h2 class="card-title">Control de Acceso Basado en Roles (RBAC)</h2>
          <p style="color:var(--text-secondary);font-size:0.93rem;">
            Seis perfiles diferenciados (Admisión, Médico, Psicólogo/Psiquiatra, Consejero, Trabajo Social y Administrador) validados tanto en el backend FastAPI como en la interfaz, respaldados por la tabla inmutable <code>audit_logs</code>.
          </p>
        </div>

        <div class="card">
          <h2 class="card-title">Progressive Web App (PWA) Instalable</h2>
          <p style="color:var(--text-secondary);font-size:0.93rem;">
            Instalable directamente desde el navegador en Android, iOS, Windows, macOS y Linux sin tiendas intermedias. Service Worker con estrategia <em>Network-First</em> para expedientes y <em>Cache-First</em> para la interfaz, protegiendo borradores locales si se pierde señal.
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
        <span class="badge badge-gold" style="margin-bottom:10px;">Acerca del Sistema e Institución</span>
        <h1>Ángeles de Esperanza A.C. & Proyecto ÁNGELES</h1>
        <p>Tecnología humanizada al servicio de la rehabilitación integral y el acompañamiento familiar en Irapuato, Guanajuato.</p>
      </div>

      <div class="grid-2">
        <div class="card card-elevated">
          <h2 class="card-title">Institución Piloto</h2>
          <p style="color:var(--text-secondary);margin-top:10px;">
            <strong>Centro de Rehabilitación en Adicciones “ÁNGELES DE ESPERANZA A.C.”</strong><br/>
            Ubicación: Irapuato, Guanajuato, México.<br/>
            Portal institucional: <a href="https://angelesdeesperanzaac.org" target="_blank" rel="noopener noreferrer">angelesdeesperanzaac.org</a><br/>
            Directorio clínico: <a href="https://cebraher.org/angeles" target="_blank" rel="noopener noreferrer">cebraher.org/angeles</a> (<a href="/">Fundación Braher</a>)
          </p>
          <p class="muted-sm">
            Arquitectura multi-tenant preparada desde su base de datos (<code>institution_id</code>) para acompañar el crecimiento futuro de nuevos centros y redes de rehabilitación.
          </p>
        </div>

        <div class="card card-elevated">
          <h2 class="card-title">Autoría y Arquitectura de Software</h2>
          <p style="color:var(--text-secondary);margin-top:10px;">
            Desarrollado por <strong>César Augusto Bravo Hernández</strong><br/>
            Firma Profesional: <strong>CESAR A. BRAVO - DevRel @Google</strong><br/>
            Sitio Web Oficial: <a href="https://cebraher.com" target="_blank" rel="noopener noreferrer">https://cebraher.com</a><br/>
            Contacto: <a href="mailto:cesarbraher@gmail.com">cesarbraher@gmail.com</a>
          </p>
          <blockquote class="hero-quote" style="margin-top:14px;">
            <p>“Toda gran obra comienza siendo invisible. Mi labor consiste en darle forma.”</p>
            <cite>— © 2026 César Augusto Bravo Hernández</cite>
          </blockquote>
        </div>
      </div>
    </section>
  `;
}
