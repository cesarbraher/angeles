<!--
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
-->

# ÁNGELES — Sistema Integral de Expediente Clínico Electrónico (PWA)

> *“Toda gran obra comienza siendo invisible. Mi labor consiste en darle forma.”*  
> — **César Augusto Bravo Hernández** | **CESAR A. BRAVO - DevRel @Google** (`cebraher.com`)

**ÁNGELES (Versión 1.0-BETA)** es una **Progressive Web App (PWA) instalable** en Android, iOS, Windows, macOS y Linux directamente desde el navegador, diseñada para digitalizar, centralizar y dar trazabilidad integral a los procesos clínicos, terapéuticos y administrativos del **Centro de Rehabilitación en Adicciones “Ángeles de Esperanza A.C.”** (Irapuato, Guanajuato, México — `angelesdeesperanzaac.org`).

- **Portal Principal (Landing):** `https://cebraher.org` (**FUNDACIÓN BRAHER**)
- **Directorio del Sistema ÁNGELES (PWA):** `https://cebraher.org/angeles` / `https://braher.org/angeles`
- **Repositorio GitHub:** `https://github.com/cesarbraher/angeles`
- **Autor y Arquitecto Creador:** César Augusto Bravo Hernández (`cesarbraher@gmail.com` · `https://cebraher.com`)

---

## Características Principales

1. **Portal Raíz (`frontend/index.html`) + Directorio `/angeles` (`frontend/angeles/`):**
   - La página principal en `/` (`cebraher.org`) presenta la landing minimalista **FUNDACIÓN BRAHER** con enlace directo a `/angeles/` (`braher.org/angeles`).
   - Todo el sistema **ÁNGELES** opera íntegro bajo el directorio `/angeles/` (incluyendo `manifest.json`, `sw.js`, iconos, rutas SPA y módulos clínicos).
2. **Barra Superior Permanente con Buscador Global y Botón de Descarga de la App:**
   - **Buscador global** en tiempo real (`/api/v1/search`, atajo `/` o `Ctrl+K`) para localizar expedientes por nombre, folio (`ANG-2026-XXX`), CURP o módulos autorizados.
   - **Botón directo “Descargar App”** en la barra superior (y menú lateral) que dispara la instalación nativa PWA (`beforeinstallprompt`), guía visual paso a paso para iOS Safari / Android / Escritorio, y descarga de acceso directo web (`/api/v1/app/launcher`).
3. **Progressive Web App (PWA) Completa:**
   - `manifest.json` (`standalone`, `scope: "/angeles/"`, `#0F4C81`, `#F8FAFC`) con juego completo de iconos PNG (`72x72` hasta `512x512` + `apple-touch-icon.png`).
   - Service Worker (`/angeles/sw.js`) con estrategia **Network-First** para APIs clínicas, **Cache-First** para activos estáticos, pantalla `/angeles/offline.html` y respaldo local de borradores SOAP.
4. **Los 6 Módulos Clínicos + Expansión:**
   - **Módulo 1 — Admisión e Ingreso:** Ficha demográfica, **Consentimiento Informado con Pad de Firma Táctil Capacitiva (HTML5 Canvas)** con SHA-256 e inventario de pertenencias.
   - **Módulo 2 — Área Médica:** Historia clínica, alergias, signos vitales continuos (TA, FC, FR, Temp, SpO2, Glucosa), recetas y protocolo de desintoxicación.
   - **Módulo 3 — Psicología y Psiquiatría:** Anamnesis, pruebas psicométricas, codificación **CIE-11 / DSM-5** y plan terapéutico.
   - **Módulo 4 — Consejería y Mentoría:** Seguimiento visual del **Programa de 12 Pasos** y bitácora de sesiones.
   - **Módulo 5 — Notas de Evolución SOAP + IA Gemini:** Dictado por voz / texto libre estructurado en borrador editable vía `POST /api/v1/ai/assist-soap` (la IA nunca guarda ni diagnostica sola), firma **SHA-256** inmutable y soporte de **Nota Aclaratoria / Adenda**.
   - **Módulo 6 — Egreso / Alta:** Dictamen de conclusión, entrega de inventario y Plan de Prevención de Recaídas.
   - **Expansión:** Trabajo Social y Entorno Familiar, Laboratorio Toxicológico y Seguimiento Post-Egreso (1, 3, 6 y 12 meses).
5. **Seguridad JWT, Matriz RBAC de 6 Roles y Auditoría Inmutable (`audit_logs`):**
   - Permisos estrictos aplicados en Backend FastAPI y Frontend para `ADMIN`, `ADMISSION`, `DOCTOR`, `PSYCHOLOGIST`, `COUNSELOR` y `SOCIAL_WORKER`.
   - Ningún usuario (ni siquiera `ADMIN`) puede borrar notas SOAP firmadas ni registros de `audit_logs`.

---

## Estructura del Repositorio

```text
angeles/
├── .env.example                       # Plantilla segura de variables de entorno
├── .gitignore                         # Protege .env, entornos virtuales y temporales
├── Dockerfile                         # Contenedor listo para VPS o Google Cloud Run
├── docker-compose.yml                 # Orquestación local/producción
├── requirements.txt                   # Dependencias Python (FastAPI, SQLAlchemy, PyMySQL, GenAI)
├── database/
│   └── schema_mysql_angeles.sql       # Esquema MySQL 8.0 / MariaDB (utf8mb4_unicode_ci) + triggers + semillas
├── backend/
│   ├── main.py                        # FastAPI: / (FUNDACIÓN BRAHER), /angeles/* (PWA), /api/v1/*, /docs
│   ├── config.py                      # Configuración vía .env (MySQL / PostgreSQL / SQLite dev)
│   ├── database.py                    # Motor SQLAlchemy agnóstico
│   ├── models.py                      # 14 modelos ORM multi-tenant (institution_id)
│   ├── schemas.py                     # Validación estricta Pydantic v2
│   ├── security.py                    # Bcrypt, JWT HS256 y firmas SHA-256
│   ├── rbac.py                        # Matriz estricta de permisos por rol
│   ├── audit.py                       # Registro inmutable en audit_logs
│   ├── ai_service.py                  # Asistente SOAP con Google Gemini (borrador seguro)
│   ├── seed.py                        # Datos semilla institucionales idempotentes
│   └── routers/                       # auth, dashboard, patients, clinical, expansion, admin
├── frontend/
│   ├── index.html                     # Landing principal en / ("FUNDACIÓN BRAHER" + enlace a /angeles/)
│   └── angeles/                       # Directorio completo del sistema ÁNGELES
│       ├── index.html                 # Shell PWA con barra superior (buscador + Descargar App)
│       ├── manifest.json              # Web App Manifest instalable (scope: /angeles/)
│       ├── sw.js                      # Service Worker (Network-First API / Cache-First Shell)
│       ├── offline.html               # Respaldo sin conexión
│       ├── assets/                    # Ilustración institucional + iconos PWA 72px..512px
│       ├── css/styles.css             # Sistema de diseño humanizado Mobile-First
│       └── js/                        # Módulos ES6 (app, api, pwa, search, rbac, signature-pad, views/*)
├── deploy/
│   ├── nginx-cebraher.org.conf
│   ├── angeles.service
│   └── start.sh
└── tests/
    └── test_api.py                    # Pruebas automatizadas de Landing, PWA, Auth, RBAC, SOAP, SHA-256 e IA
```

---

## Ejecución Local Rápida (Desarrollo y Pruebas)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Iniciar servidor (usa SQLite local automáticamente si no hay .env de MySQL)
uvicorn backend.main:app --reload --port 8000
```

- **Landing Principal (FUNDACIÓN BRAHER):** `http://localhost:8000/`
- **Sistema ÁNGELES (PWA):** `http://localhost:8000/angeles/`
- **Documentación OpenAPI (Swagger):** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

> **Cuentas piloto Fase Beta (contraseña inicial: `Angeles2026!` — cambiar inmediatamente en producción):**
> - Admin: `cesarbraher` (`cesarbraher@gmail.com`)
> - Médico: `dr.mendoza` | Psicología: `psi.navarro` | Consejería: `con.ramirez` | Admisión: `adm.torres` | Trabajo Social: `ts.delgado`

---

## Guía de Despliegue en Producción (`https://cebraher.org` y `/angeles`)

> **Requisito obligatorio PWA:** Los navegadores (Chrome, Edge, Safari iOS/macOS) requieren **HTTPS activo con certificado SSL válido** para habilitar el botón nativo de instalación (`beforeinstallprompt`) y el Service Worker en `/angeles/sw.js`.

### 1. Preparar Base de Datos MySQL (`u529127178_adulam`)

Importar el esquema maestro con triggers de inmutabilidad y datos semilla:

```bash
mysql -u u529127178_angeles -p u529127178_adulam < database/schema_mysql_angeles.sql
```

### 2. Configurar Variables de Entorno en el Servidor (`.env`)

En el servidor (por ejemplo `/var/www/angeles`), copiar `.env.example` a `.env` y llenar las credenciales reales (nunca subir `.env` al repositorio):

```bash
cp .env.example .env
nano .env
```

Asegúrate de configurar:
- `APP_DOMAIN="https://cebraher.org/angeles"`
- `DB_ENGINE="mysql+pymysql"`
- `DB_HOST="localhost"`
- `DB_PORT="3306"`
- `DB_NAME="u529127178_adulam"`
- `DB_USER="u529127178_angeles"`
- `DB_PASSWORD="<TU_CONTRASEÑA_MYSQL>"`
- `JWT_SECRET_KEY="$(openssl rand -hex 32)"`
- `GEMINI_API_KEY="<TU_API_KEY_DE_GOOGLE_AI_STUDIO>"`

### 3. Instalar Dependencias y Servicio `systemd`

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

sudo cp deploy/angeles.service /etc/systemd/system/angeles.service
sudo systemctl daemon-reload
sudo systemctl enable --now angeles.service
sudo systemctl status angeles.service
```

### 4. Configurar Nginx + Certificado HTTPS (Let's Encrypt)

```bash
sudo cp deploy/nginx-cebraher.org.conf /etc/nginx/sites-available/cebraher.org
sudo ln -s /etc/nginx/sites-available/cebraher.org /etc/nginx/sites-enabled/
sudo certbot --nginx -d cebraher.org -d www.cebraher.org -d braher.org -d www.braher.org
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Verificar Salud e Instalación PWA

1. Confirmar `https://cebraher.org/api/v1/health` responde `"status": "healthy"` y `"database_driver": "mysql"`.
2. Abrir `https://cebraher.org/` para ver la portada **FUNDACIÓN BRAHER** con el enlace directo a `/angeles/`.
3. Entrar a `https://cebraher.org/angeles/` (o `https://braher.org/angeles/`) y presionar el botón **“Descargar App”** en la barra superior para instalar ÁNGELES en pantalla completa.

---

*Desarrollado por **César Augusto Bravo Hernández** | **CESAR A. BRAVO - DevRel @Google** (`cebraher.com`) para **Ángeles de Esperanza A.C.***  
*Todos los derechos reservados © 2026 César Augusto Bravo Hernández.*
