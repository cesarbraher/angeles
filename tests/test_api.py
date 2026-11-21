"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _login(client: TestClient, identifier: str, password: str = "Angeles2026!") -> dict:
    res = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})
    assert res.status_code == 200, res.text
    return res.json()


def test_health_and_pwa_assets(client: TestClient):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "healthy"
    assert body["app"] == "ANGELES"
    assert body["app_base_path"] == "/angeles"

    # Landing principal en la raíz (cebraher.org /) -> FUNDACIÓN BRAHER + enlace a /angeles/
    root_page = client.get("/")
    assert root_page.status_code == 200
    assert "FUNDACIÓN BRAHER" in root_page.text
    assert 'href="/angeles/"' in root_page.text

    # Sistema ÁNGELES en /angeles/
    angeles_page = client.get("/angeles/")
    assert angeles_page.status_code == 200
    assert "/angeles/manifest.json" in angeles_page.text

    manifest = client.get("/angeles/manifest.json")
    assert manifest.status_code == 200
    mdata = manifest.json()
    assert mdata["short_name"] == "ÁNGELES"
    assert mdata["start_url"] == "/angeles/dashboard"
    assert mdata["scope"] == "/angeles/"
    assert mdata["display"] == "standalone"
    assert len(mdata["icons"]) == 8

    sw = client.get("/angeles/sw.js")
    assert sw.status_code == 200
    assert "CACHE_STATIC" in sw.text

    offline = client.get("/angeles/offline.html")
    assert offline.status_code == 200

    launcher = client.get("/api/v1/app/launcher")
    assert launcher.status_code == 200
    assert "Angeles-App-AccesoDirecto.html" in launcher.headers.get("content-disposition", "")


def test_rbac_enforcement_across_roles(client: TestClient):
    # Admisión NO puede escribir en Módulo Médico ni entrar a Admin
    adm = _login(client, "adm.torres")
    adm_headers = {"Authorization": f"Bearer {adm['access_token']}"}

    r_med = client.put("/api/v1/patients/1/medical", json={"allergies": "Penicilina"}, headers=adm_headers)
    assert r_med.status_code == 403

    r_admin = client.get("/api/v1/admin/users", headers=adm_headers)
    assert r_admin.status_code == 403

    # Full chart para Admisión oculta medical/psychology/counseling/soap
    chart = client.get("/api/v1/patients/1/full-chart", headers=adm_headers)
    assert chart.status_code == 200
    modules = chart.json()["modules"]
    assert modules["admission"]["access"] == "write"
    assert modules["medical"]["data"] is None
    assert modules["psychology"]["data"] is None
    assert modules["counseling"]["data"] is None
    assert modules["soap"]["notes"] == []

    # Consejero puede escribir en Consejería y SOAP, pero NO en Módulo Médico
    con = _login(client, "con.ramirez")
    con_headers = {"Authorization": f"Bearer {con['access_token']}"}
    assert client.put("/api/v1/patients/1/medical", json={"allergies": "Test"}, headers=con_headers).status_code == 403
    assert client.put("/api/v1/patients/1/counseling", json={"current_step": 5}, headers=con_headers).status_code == 200


def test_search_ai_soap_signature_and_immutability(client: TestClient):
    doc = _login(client, "dr.mendoza")
    headers = {"Authorization": f"Bearer {doc['access_token']}"}

    # Buscador global en barra superior
    search = client.get("/api/v1/search?q=ANG-2026-001", headers=headers)
    assert search.status_code == 200
    assert len(search.json()["patients"]) >= 1

    # Asistente IA SOAP (borrador editable, nunca guarda automáticamente)
    ai_res = client.post(
        "/api/v1/ai/assist-soap",
        json={
            "patient_id": "ANG-2026-001",
            "raw_clinician_dictation": (
                "El paciente refiere insomnio leve. Presión arterial 120/80. "
                "Se observa tranquilo pero ansioso sobre su reinserción laboral. "
                "Recomiendo mantener dosis de valproato y sesión psicológica."
            ),
        },
        headers=headers,
    )
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert ai_data["requires_clinician_review"] is True
    suggested = ai_data["suggested_soap"]

    # Firmar nota SOAP (SHA-256)
    signed = client.post(
        "/api/v1/clinical/soap-notes",
        json={
            "patient_id": 1,
            "note_category": "EVOLUCION_MEDICA",
            "subjective": suggested["subjective"],
            "objective": suggested["objective"],
            "assessment": suggested["assessment"],
            "plan": suggested["plan"],
            "ai_assisted": True,
        },
        headers=headers,
    )
    assert signed.status_code == 201
    note_id = signed.json()["id"]
    assert len(signed.json()["digital_signature_hash"]) == 64

    # Inmutabilidad: ni siquiera ADMIN puede borrar notas SOAP firmadas
    admin = _login(client, "cesarbraher")
    admin_headers = {"Authorization": f"Bearer {admin['access_token']}"}
    del_res = client.delete(f"/api/v1/clinical/soap-notes/{note_id}", headers=admin_headers)
    assert del_res.status_code == 403

    # Pero SÍ se permite crear una Nota Aclaratoria / Adenda
    add_res = client.post(
        f"/api/v1/clinical/soap-notes/{note_id}/addendum",
        json={
            "subjective": "Se precisa que el insomnio inició hace 48 horas.",
            "objective": "Signos vitales reconfirmados sin cambios.",
            "assessment": "Evolución estable.",
            "plan": "Mantener seguimiento en turno nocturno.",
        },
        headers=headers,
    )
    assert add_res.status_code == 201
    assert add_res.json()["parent_note_id"] == note_id

    # Verificar auditoría inmutable como ADMIN
    audit = client.get("/api/v1/admin/audit-logs?limit=20", headers=admin_headers)
    assert audit.status_code == 200
    actions = [row["action"] for row in audit.json()["logs"]]
    assert "SIGN_SOAP_NOTE" in actions
    assert "BLOCKED_SOAP_DELETE_ATTEMPT" in actions
