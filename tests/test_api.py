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


def _login(client: TestClient, identifier: str, password: str) -> dict:
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

    # Landing principal en la raíz -> FUNDACIÓN BRAHER + enlace a /angeles/
    root_page = client.get("/")
    assert root_page.status_code == 200
    assert "FUNDACIÓN BRAHER" in root_page.text
    assert 'href="/angeles/"' in root_page.text

    # Sistema ÁNGELES en /angeles/ y /angeles/registro
    angeles_page = client.get("/angeles/")
    assert angeles_page.status_code == 200
    assert "/angeles/manifest.json" in angeles_page.text
    assert client.get("/angeles/registro").status_code == 200

    manifest = client.get("/angeles/manifest.json")
    assert manifest.status_code == 200
    mdata = manifest.json()
    assert mdata["short_name"] == "ÁNGELES"
    assert mdata["start_url"] == "/angeles/dashboard"
    assert mdata["scope"] == "/angeles/"
    assert len(mdata["icons"]) == 8

    assert client.get("/angeles/sw.js").status_code == 200
    assert client.get("/angeles/offline.html").status_code == 200


def test_master_account_and_professional_registration_approval_workflow(client: TestClient):
    # 1. Master único: usuario "abun", contraseña "ábba", nombre "ÁNGELES DE ESPERANZA"
    master = _login(client, "abun", "ábba")
    assert master["user"]["full_name"] == "ÁNGELES DE ESPERANZA"
    assert master["user"]["role_code"] == "ADMIN"
    master_headers = {"Authorization": f"Bearer {master['access_token']}"}

    # 2. Registro público de un Psicólogo con documento PDF adjunto
    reg_res = client.post(
        "/api/v1/auth/register-professional",
        json={
            "full_name": "Dra. Laura Morales Pérez",
            "role_code": "PSYCHOLOGIST",
            "username": "psi.laura",
            "email": "laura.morales@ejemplo.org",
            "password": "MiPasswordSeguro123",
            "curp": "MOPL900101MGTLRN01",
            "phone": "462-555-0199",
            "professional_license": "CED-PSI-998877",
            "specialty": "Psicología Clínica en Adicciones",
            "university": "Universidad de Guanajuato",
            "graduation_year": 2016,
            "experience_years": 9,
            "documents": [
                {
                    "file_name": "cedula_profesional.pdf",
                    "doc_type": "Cédula Profesional",
                    "mime_type": "application/pdf",
                    "size_bytes": 1024,
                    "data_url": "data:application/pdf;base64,JVBERi0xLjQKJQ==",
                }
            ],
        },
    )
    assert reg_res.status_code == 201, reg_res.text
    prof_id = reg_res.json()["id"]
    assert reg_res.json()["status"] == "pending_approval"

    # 3. Antes de ser autorizado por Master, el profesional NO puede iniciar sesión (403)
    blocked_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "psi.laura", "password": "MiPasswordSeguro123"},
    )
    assert blocked_login.status_code == 403

    # 4. Master ve la solicitud pendiente con su documento adjunto
    pending = client.get("/api/v1/admin/professionals?approval_status=PENDING", headers=master_headers)
    assert pending.status_code == 200
    assert pending.json()["pending_count"] >= 1
    found = [p for p in pending.json()["professionals"] if p["id"] == prof_id]
    assert len(found) == 1
    assert len(found[0]["documents_json"]) == 1

    # 5. Master autoriza el registro
    approve = client.post(f"/api/v1/admin/professionals/{prof_id}/approve", headers=master_headers)
    assert approve.status_code == 200
    assert approve.json()["status"] == "approved"

    # 6. Ahora el profesional SÍ puede iniciar sesión y se aplica su matriz RBAC (Psicólogo)
    prof = _login(client, "psi.laura", "MiPasswordSeguro123")
    prof_headers = {"Authorization": f"Bearer {prof['access_token']}"}
    assert client.put("/api/v1/patients/1/psychology", json={"cie11_code": "6C40.2", "signatures_json": {"professional_name": "Dra. Laura Morales Pérez"}}, headers=prof_headers).status_code == 200
    assert client.put("/api/v1/patients/1/medical", json={"allergies": "No autorizado"}, headers=prof_headers).status_code == 403
    assert client.get("/api/v1/admin/professionals", headers=prof_headers).status_code == 403


def test_search_ai_soap_signature_and_immutability(client: TestClient):
    master = _login(client, "abun", "ábba")
    headers = {"Authorization": f"Bearer {master['access_token']}"}

    search = client.get("/api/v1/search?q=ANG-2026-001", headers=headers)
    assert search.status_code == 200
    assert len(search.json()["patients"]) >= 1

    ai_res = client.post(
        "/api/v1/ai/assist-soap",
        json={
            "patient_id": "ANG-2026-001",
            "raw_clinician_dictation": (
                "El paciente refiere insomnio leve. Presión arterial 120/80. "
                "Se observa tranquilo. Recomiendo mantener seguimiento psicológico."
            ),
        },
        headers=headers,
    )
    assert ai_res.status_code == 200
    suggested = ai_res.json()["suggested_soap"]

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
            "signatures_json": {
                "professional_name": "ÁNGELES DE ESPERANZA",
                "patient_name": "Carlos Alberto Hernández López",
            },
        },
        headers=headers,
    )
    assert signed.status_code == 201
    note_id = signed.json()["id"]
    assert len(signed.json()["digital_signature_hash"]) == 64

    # Inmutabilidad: ni siquiera Master puede borrar notas SOAP firmadas
    assert client.delete(f"/api/v1/clinical/soap-notes/{note_id}", headers=headers).status_code == 403

    # Pero sí puede agregar Nota Aclaratoria / Adenda
    add_res = client.post(
        f"/api/v1/clinical/soap-notes/{note_id}/addendum",
        json={
            "subjective": "Aclaración clínica complementaria.",
            "objective": "Signos estables.",
            "assessment": "Evolución favorable.",
            "plan": "Continuar seguimiento.",
        },
        headers=headers,
    )
    assert add_res.status_code == 201
    assert add_res.json()["parent_note_id"] == note_id
