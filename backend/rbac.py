"""
@project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
@institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
@author      César Augusto Bravo Hernández
@role        CESAR A. BRAVO - DevRel @Google
@contact     cesarbraher@gmail.com | https://cebraher.com
@copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
"""

from fastapi import Depends, HTTPException, status

from backend.models import User
from backend.security import get_current_user

# Matriz estricta de Control de Acceso Basado en Roles (RBAC)
# Niveles: "none" | "read" | "write" | "full"
RBAC_MATRIX: dict[str, dict[str, str]] = {
    "ADMIN": {
        "admission": "full",
        "medical": "full",
        "psychology": "full",
        "counseling": "full",
        "soap": "full",
        "discharge": "full",
        "expansion": "full",
        "admin": "full",
    },
    "ADMISSION": {
        "admission": "write",
        "medical": "none",
        "psychology": "none",
        "counseling": "none",
        "soap": "none",
        "discharge": "read",
        "expansion": "read",
        "admin": "none",
    },
    "DOCTOR": {
        "admission": "read",
        "medical": "write",
        "psychology": "read",
        "counseling": "none",
        "soap": "write",
        "discharge": "write",
        "expansion": "write",
        "admin": "none",
    },
    "PSYCHOLOGIST": {
        "admission": "read",
        "medical": "read",
        "psychology": "write",
        "counseling": "read",
        "soap": "write",
        "discharge": "write",
        "expansion": "read",
        "admin": "none",
    },
    "COUNSELOR": {
        "admission": "read",
        "medical": "none",
        "psychology": "none",
        "counseling": "write",
        "soap": "write",
        "discharge": "read",
        "expansion": "none",
        "admin": "none",
    },
    "SOCIAL_WORKER": {
        "admission": "read",
        "medical": "none",
        "psychology": "none",
        "counseling": "none",
        "soap": "write",
        "discharge": "read",
        "expansion": "write",
        "admin": "none",
    },
}

ACCESS_RANK = {"none": 0, "read": 1, "write": 2, "full": 3}


def get_role_permissions(role_code: str) -> dict[str, str]:
    """Devuelve el mapa de permisos del rol especificado."""
    return RBAC_MATRIX.get(role_code.upper(), {k: "none" for k in RBAC_MATRIX["ADMIN"]})


def has_permission(role_code: str, module: str, required: str = "read") -> bool:
    """Evalúa si un rol cumple el nivel de acceso requerido para un módulo."""
    perms = get_role_permissions(role_code)
    current_level = perms.get(module, "none")
    return ACCESS_RANK.get(current_level, 0) >= ACCESS_RANK.get(required, 1)


def require_permission(module: str, required: str = "read"):
    """Dependencia FastAPI que aplica estrictamente la matriz RBAC por endpoint."""

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        role_code = current_user.role.code if current_user.role else "UNKNOWN"
        if not has_permission(role_code, module, required):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Acceso denegado (RBAC): el rol '{role_code}' no cuenta con permiso "
                    f"de '{required}' en el módulo '{module}'."
                ),
            )
        return current_user

    return dependency
