"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

import json
import re

from backend.config import get_settings
from backend.schemas import AiSoapAssistResponse, SuggestedSoapPayload

SAFETY_NOTICE = (
    "BORRADOR ASISTIDO POR IA: Esta propuesta estructurada NO se guarda automáticamente "
    "ni sustituye el criterio clínico. El profesional autenticado debe revisar, editar y "
    "confirmar explícitamente antes de firmar con SHA-256."
)


def _heuristic_soap_parse(raw_text: str) -> SuggestedSoapPayload:
    """Estructurador clínico local determinístico cuando GEMINI_API_KEY aún no está configurada."""
    text = raw_text.strip()
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text) if s.strip()]

    subj_parts: list[str] = []
    obj_parts: list[str] = []
    assess_parts: list[str] = []
    plan_parts: list[str] = []

    subj_kw = (
        "refiere", "manifiesta", "reporta", "expresa", "dice", "siente",
        "insomnio", "dolor", "ansiedad", "deseo", "craving", "preocup", "sueño",
    )
    obj_kw = (
        "presión", "ta ", "fc ", "fr ", "temp", "spo2", "glucosa", "signos",
        "observa", "mmhg", "lpm", "orientado", "tranquilo", "agitado", "afect", "conducta",
    )
    plan_kw = (
        "recomiendo", "mantener", "ajustar", "programar", "iniciar", "suspender",
        "continuar", "sesión", "dosis", "valproato", "medic", "seguimiento", "cita", "plan",
    )
    assess_kw = (
        "evolución", "diagnóstico", "estable", "riesgo", "impresión", "cuadro",
        "mejora", "progreso", "síndrome", "trastorno", "valoración",
    )

    for sent in sentences:
        low = sent.lower()
        if any(k in low for k in plan_kw):
            plan_parts.append(sent)
        elif any(k in low for k in obj_kw):
            obj_parts.append(sent)
        elif any(k in low for k in assess_kw):
            assess_parts.append(sent)
        elif any(k in low for k in subj_kw):
            subj_parts.append(sent)
        else:
            subj_parts.append(sent)

    subjective = " ".join(subj_parts) if subj_parts else f"El paciente expresa: {text}"
    objective = (
        " ".join(obj_parts)
        if obj_parts
        else "Hallazgos observables y signos vitales pendientes de verificación por el clínico."
    )
    assessment = (
        " ".join(assess_parts)
        if assess_parts
        else "Evolución clínica en valoración; integrar con antecedentes del expediente y signos actuales."
    )
    plan = (
        "\n".join(f"{idx + 1}. {item}" for idx, item in enumerate(plan_parts))
        if plan_parts
        else "1. Continuar plan terapéutico multidisciplinario vigente.\n2. Reevaluar en siguiente pase de visita."
    )

    return SuggestedSoapPayload(
        subjective=subjective,
        objective=objective,
        assessment=assessment,
        plan=plan,
    )


def structure_soap_with_gemini(raw_text: str) -> AiSoapAssistResponse:
    """Invoca Google Gemini para estructurar texto libre en borrador SOAP (nunca auto-guarda)."""
    settings = get_settings()
    api_key = (settings.GEMINI_API_KEY or "").strip()

    if api_key and api_key != "[API_KEY_GOOGLE_GEMINI]":
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            prompt = (
                "Eres un asistente de documentación clínica para un centro de rehabilitación "
                "(Ángeles de Esperanza A.C.). Organiza el siguiente dictado o texto libre del "
                "profesional en un borrador estructurado bajo metodología SOAP en español clínico "
                "claro, respetuoso y preciso. NO inventes signos vitales ni diagnósticos que no "
                "aparezcan en el texto. Responde EXCLUSIVAMENTE con un objeto JSON válido con las "
                "claves exactas: subjective, objective, assessment, plan.\n\n"
                f"TEXTO DEL PROFESIONAL:\n{raw_text}"
            )
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            parsed = json.loads(response.text)
            suggested = SuggestedSoapPayload(
                subjective=str(parsed.get("subjective", "")).strip() or "Sin datos subjetivos registrados.",
                objective=str(parsed.get("objective", "")).strip() or "Sin hallazgos objetivos registrados.",
                assessment=str(parsed.get("assessment", "")).strip() or "Valoración pendiente de confirmar por el clínico.",
                plan=str(parsed.get("plan", "")).strip() or "Definir indicaciones y seguimiento.",
            )
            return AiSoapAssistResponse(
                status="success",
                ai_provider=f"google-genai:{settings.GEMINI_MODEL}",
                requires_clinician_review=True,
                safety_notice=SAFETY_NOTICE,
                suggested_soap=suggested,
            )
        except Exception:
            # Si falla la red o la cuota en beta, degradar de forma segura sin interrumpir al clínico
            pass

    return AiSoapAssistResponse(
        status="success",
        ai_provider="clinical-structured-fallback",
        requires_clinician_review=True,
        safety_notice=SAFETY_NOTICE,
        suggested_soap=_heuristic_soap_parse(raw_text),
    )
