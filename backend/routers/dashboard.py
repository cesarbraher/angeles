"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import AuditLog, Patient, PostDischargeFollowup, SoapNote, User
from backend.rbac import get_role_permissions
from backend.security import get_current_user

router = APIRouter(prefix="/api/v1", tags=["Panel de Control y Buscador Global"])


@router.get("/dashboard/summary")
def dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Indicadores en tiempo real, alertas clínicas y actividad reciente del centro."""
    inst_id = current_user.institution_id
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today = date.today()
    next_30 = today + timedelta(days=30)

    patients_q = db.query(Patient).filter(Patient.institution_id == inst_id)
    active_patients = patients_q.filter(Patient.status == "ADMITTED").count()
    discharged_patients = patients_q.filter(Patient.status == "DISCHARGED").count()
    admissions_this_month = patients_q.filter(Patient.admission_date >= month_start).count()
    planned_discharges = (
        patients_q.filter(
            Patient.status == "ADMITTED",
            Patient.planned_discharge_date.is_not(None),
            Patient.planned_discharge_date <= next_30,
        ).count()
    )
    alerts_patients = (
        patients_q.filter(Patient.alert_flag.is_(True), Patient.status == "ADMITTED")
        .order_by(Patient.updated_at.desc())
        .all()
    )

    recent_soap_count = (
        db.query(SoapNote)
        .filter(SoapNote.institution_id == inst_id, SoapNote.created_at >= now - timedelta(days=7))
        .count()
    )
    upcoming_followups = (
        db.query(PostDischargeFollowup)
        .filter(
            PostDischargeFollowup.institution_id == inst_id,
            PostDischargeFollowup.status == "PROGRAMADO",
        )
        .count()
    )

    recent_activity = (
        db.query(AuditLog)
        .filter(AuditLog.institution_id == inst_id)
        .order_by(AuditLog.created_at.desc())
        .limit(10)
        .all()
    )

    active_list = (
        patients_q.filter(Patient.status == "ADMITTED")
        .order_by(Patient.admission_date.desc())
        .limit(8)
        .all()
    )

    return {
        "metrics": {
            "active_patients": active_patients,
            "admissions_this_month": admissions_this_month,
            "planned_discharges_30d": planned_discharges,
            "pending_alerts": len(alerts_patients),
            "discharged_total": discharged_patients,
            "soap_notes_7d": recent_soap_count,
            "upcoming_followups": upcoming_followups,
        },
        "alerts": [
            {
                "patient_id": p.id,
                "folio": p.folio,
                "full_name": f"{p.first_name} {p.last_name}",
                "summary": p.alert_summary or "Requiere valoración clínica prioritaria",
                "updated_at": p.updated_at.isoformat(),
            }
            for p in alerts_patients
        ],
        "active_patients": [
            {
                "id": p.id,
                "folio": p.folio,
                "full_name": f"{p.first_name} {p.last_name}",
                "curp": p.curp,
                "status": p.status,
                "admission_date": p.admission_date.isoformat(),
                "planned_discharge_date": p.planned_discharge_date.isoformat() if p.planned_discharge_date else None,
                "alert_flag": p.alert_flag,
                "alert_summary": p.alert_summary,
            }
            for p in active_list
        ],
        "recent_activity": [
            {
                "id": log.id,
                "role": log.role,
                "action": log.action,
                "table_name": log.table_name,
                "record_id": log.record_id,
                "details": log.details,
                "created_at": log.created_at.isoformat(),
            }
            for log in recent_activity
        ],
    }


@router.get("/search")
def global_search(
    q: str = Query(..., min_length=1, max_length=120, description="Nombre, folio ANG-2026-XXX, CURP o módulo"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Buscador global en barra superior: expedientes, módulos autorizados y secciones."""
    term = q.strip()
    like_term = f"%{term}%"
    inst_id = current_user.institution_id

    patients = (
        db.query(Patient)
        .filter(
            Patient.institution_id == inst_id,
            or_(
                Patient.folio.ilike(like_term),
                Patient.first_name.ilike(like_term),
                Patient.last_name.ilike(like_term),
                Patient.curp.ilike(like_term),
                Patient.alert_summary.ilike(like_term),
            ),
        )
        .order_by(Patient.updated_at.desc())
        .limit(10)
        .all()
    )

    perms = get_role_permissions(current_user.role.code if current_user.role else "")
    catalog = [
        {"title": "Panel de Control", "subtitle": "Indicadores y alertas en tiempo real", "route": "/angeles/dashboard", "module": "admission", "keywords": "dashboard panel metricas alertas"},
        {"title": "Expedientes Clínicos", "subtitle": "Listado y alta de expedientes ANG-2026", "route": "/angeles/expedientes", "module": "admission", "keywords": "expedientes pacientes ingreso admision"},
        {"title": "Trabajo Social y Entorno Familiar", "subtitle": "Módulo de expansión socioeconómica", "route": "/angeles/modulos-expansion", "module": "expansion", "keywords": "trabajo social familia visitas apoyo"},
        {"title": "Laboratorio y Tamizajes Toxicológicos", "subtitle": "Pruebas antidoping y gabinete", "route": "/angeles/modulos-expansion", "module": "expansion", "keywords": "laboratorio antidoping toxicologia tamizaje"},
        {"title": "Seguimiento Post-Egreso (1, 3, 6 y 12 meses)", "subtitle": "Prevención de recaídas post-alta", "route": "/angeles/modulos-expansion", "module": "expansion", "keywords": "seguimiento post egreso recaidas llamadas"},
        {"title": "Administración y Auditoría Inmutable", "subtitle": "Usuarios, roles RBAC y audit_logs", "route": "/angeles/administracion", "module": "admin", "keywords": "administracion usuarios roles rbac auditoria"},
        {"title": "Acerca del Sistema ÁNGELES", "subtitle": "Información institucional y autoría", "route": "/angeles/nosotros", "module": "admission", "keywords": "acerca institucion cesar bravo devrel"},
    ]

    low_q = term.lower()
    sections = [
        {"title": item["title"], "subtitle": item["subtitle"], "route": item["route"]}
        for item in catalog
        if perms.get(item["module"], "none") != "none"
        and (
            low_q in item["title"].lower()
            or low_q in item["subtitle"].lower()
            or low_q in item["keywords"]
        )
    ]

    return {
        "query": term,
        "patients": [
            {
                "id": p.id,
                "folio": p.folio,
                "full_name": f"{p.first_name} {p.last_name}",
                "curp": p.curp,
                "status": p.status,
                "alert_flag": p.alert_flag,
                "route": f"/angeles/expedientes/{p.id}",
            }
            for p in patients
        ],
        "sections": sections,
    }
