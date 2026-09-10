"""Configuracion del entorno operativo: a que servidor apunta cada script.

Separado de vps_ssh a proposito. Los scripts que solo hacen peticiones HTTP
necesitan saber el destino, pero no tienen por que arrastrar paramiko: importarlo
les anadia una dependencia que nunca usaron y convertia un error de configuracion
claro en un ModuleNotFoundError.
"""

from __future__ import annotations

import os


class ConfigError(RuntimeError):
    """Falta configuracion obligatoria del entorno."""


def require_env(name: str, ayuda: str) -> str:
    """Lee una variable obligatoria; falla con una instruccion concreta si falta."""
    valor = os.environ.get(name, "").strip()
    if not valor:
        raise ConfigError(f"Falta la variable de entorno {name}. {ayuda}")
    return valor


def app_base_url() -> str:
    """URL publica de la aplicacion contra la que trabaja el script.

    Obligatoria y sin valor por defecto: un script de verificacion que apunta solo
    al entorno equivocado es peor que uno que no corre.
    """
    return require_env(
        "APP_BASE_URL",
        "Ejemplo: export APP_BASE_URL=https://mi-servidor.example",
    ).rstrip("/")


def admin_email() -> str:
    """Cuenta administradora del servidor al que apunta el script."""
    return require_env(
        "APP_ADMIN_EMAIL",
        "Correo de la cuenta administradora del servidor objetivo.",
    )
