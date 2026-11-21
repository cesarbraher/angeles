/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

const RANK = { none: 0, read: 1, write: 2, full: 3 };

export function canAccess(user, moduleName, required = "read") {
  if (!user || !user.permissions) return false;
  const level = user.permissions[moduleName] || "none";
  return (RANK[level] || 0) >= (RANK[required] || 1);
}

export function accessLabel(level) {
  const map = {
    full: "Control Total",
    write: "Lectura / Escritura",
    read: "Solo Lectura",
    none: "Sin acceso",
  };
  return map[level] || "Sin acceso";
}

export function statusBadge(status) {
  if (status === "ADMITTED") return `<span class="badge badge-green">Activo internado</span>`;
  if (status === "DISCHARGED") return `<span class="badge badge-blue">Egresado</span>`;
  if (status === "TRANSFERRED") return `<span class="badge badge-gold">Trasladado</span>`;
  return `<span class="badge badge-gray">${status || "—"}</span>`;
}
