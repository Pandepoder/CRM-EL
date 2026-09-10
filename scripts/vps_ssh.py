"""Conexion SSH verificada contra los servidores operativos.

Todo script de operacion debe abrir su sesion con connect() en vez de construir
su propio SSHClient. Centraliza tres controles que antes faltaban en cada script
por separado:

  1. El destino ya no esta incrustado en el codigo. VPS_HOST es obligatorio, asi
     que un script no puede correr contra el servidor equivocado por descuido ni
     deja la direccion del servidor dentro del repositorio.

  2. La identidad del servidor se verifica contra un known_hosts. Antes cada
     script usaba AutoAddPolicy, que acepta cualquier clave que anuncie el otro
     extremo: quien pudiera interponerse en la conexion recibia la contrasena de
     root sin que nada fallara.

  3. El usuario remoto y el metodo de autenticacion son explicitos. Paramiko
     intenta el agente SSH y las llaves de ~/.ssh antes de la contrasena, asi que
     sin fijar allow_agent/look_for_keys no se sabe con que credencial entro un
     script realmente.
"""

from __future__ import annotations

import os
import sys

import paramiko

from entorno import ConfigError, app_base_url, require_env  # noqa: F401

DEFAULT_TIMEOUT = 15


# Se conserva el nombre por compatibilidad con los scripts que lo capturan.
VpsConfigError = ConfigError




def known_hosts_path() -> str:
    """Ruta del known_hosts que autoriza al servidor.

    Se resuelve por VPS_KNOWN_HOSTS_FILE para poder mantener un archivo propio
    del proyecto, revisable, en vez de depender del ~/.ssh/known_hosts personal
    de quien ejecute el script.
    """
    explicito = os.environ.get("VPS_KNOWN_HOSTS_FILE", "").strip()
    if explicito:
        return os.path.expanduser(explicito)
    return os.path.expanduser("~/.ssh/known_hosts")


def target() -> tuple[str, str, int]:
    """Devuelve (host, usuario, puerto) del servidor objetivo."""
    host = require_env(
        "VPS_HOST",
        "Exporta la direccion del servidor antes de ejecutar el script.",
    )
    user = require_env(
        "VPS_USER",
        "Exporta la cuenta operativa remota (evita root si hay una cuenta con "
        "privilegios acotados).",
    )
    port = int(os.environ.get("VPS_PORT", "22"))
    return host, user, port


def target_or_exit() -> tuple[str, str, int]:
    """Igual que target(), pero termina el proceso con un mensaje legible."""
    try:
        return target()
    except VpsConfigError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)


def connect(*, timeout: int = DEFAULT_TIMEOUT) -> paramiko.SSHClient:
    """Abre una sesion SSH con la identidad del servidor ya verificada.

    Falla antes de autenticar si el host no esta en known_hosts o si su clave
    cambio: es justo el caso que AutoAddPolicy dejaba pasar en silencio.
    """
    host, user, port = target()

    client = paramiko.SSHClient()

    ruta_hosts = known_hosts_path()
    if not os.path.exists(ruta_hosts):
        raise VpsConfigError(
            f"No existe el archivo de hosts conocidos: {ruta_hosts}\n"
            f"Registra la clave del servidor por un canal de confianza, por ejemplo:\n"
            f"  ssh-keyscan -p {port} {host} >> {ruta_hosts}\n"
            f"y contrasta la huella con la del proveedor antes de darla por buena."
        )
    client.load_host_keys(ruta_hosts)

    # RejectPolicy en vez de AutoAddPolicy: una clave desconocida o distinta
    # aborta la conexion en lugar de aceptarla y seguir.
    client.set_missing_host_key_policy(paramiko.RejectPolicy())

    llave = os.environ.get("VPS_SSH_KEY_FILE", "").strip()
    password = os.environ.get("VPS_SSH_PASSWORD", "").strip()

    if not llave and not password:
        raise VpsConfigError(
            "Define VPS_SSH_KEY_FILE (recomendado) o VPS_SSH_PASSWORD para autenticar."
        )

    try:
        if llave:
            client.connect(
                host,
                port=port,
                username=user,
                key_filename=os.path.expanduser(llave),
                allow_agent=False,
                look_for_keys=False,
                timeout=timeout,
            )
        else:
            client.connect(
                host,
                port=port,
                username=user,
                password=password,
                allow_agent=False,
                look_for_keys=False,
                timeout=timeout,
            )
    except paramiko.BadHostKeyException as e:
        raise VpsConfigError(
            f"La clave que presento {host} no coincide con la registrada en {ruta_hosts}.\n"
            f"Se aborto la conexion sin enviar credenciales. Si el cambio es legitimo, "
            f"actualiza la entrada tras confirmarla por un canal independiente.\n"
            f"Detalle: {e}"
        ) from e
    except paramiko.SSHException as e:
        if "not found in known_hosts" in str(e):
            raise VpsConfigError(
                f"El servidor {host} no esta en {ruta_hosts}; no se envio ninguna credencial.\n"
                f"Registra su clave verificada antes de reintentar."
            ) from e
        raise

    return client


def connect_or_exit(*, timeout: int = DEFAULT_TIMEOUT) -> paramiko.SSHClient:
    """Igual que connect(), pero termina el proceso con un mensaje legible."""
    try:
        return connect(timeout=timeout)
    except VpsConfigError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)


