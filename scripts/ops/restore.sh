#!/bin/sh
# Restaura un respaldo de Tonalá OS. DESTRUCTIVO: reemplaza el contenido de la
# base destino.
#
#   docker compose run --rm --entrypoint sh \
#     -e CONFIRM_RESTORE=si-borra-la-base-destino \
#     backup /usr/local/bin/restore.sh /backups/tonala_os-<TS>.sql.gz
#
# El `--entrypoint sh` NO es opcional: `compose run` sustituye el command, no el
# entrypoint, así que sin él arranca el bucle de respaldo y se queda colgado.
#
# Para ensayar sin tocar la base buena, añade -e RESTORE_TARGET_DB=<base_de_prueba>.
#
# Un respaldo que nunca se restauró no es un respaldo, es un archivo. Correr
# esto contra una base de prueba es parte del procedimiento, no un extra.
set -eu

ARCHIVO="${1:?uso: restore.sh <ruta-del-.sql.gz>}"
: "${POSTGRES_USER:?falta POSTGRES_USER}"
: "${POSTGRES_DB:?falta POSTGRES_DB}"

HOST="${POSTGRES_HOST:-db}"
DESTINO="${RESTORE_TARGET_DB:-$POSTGRES_DB}"

if [ "${CONFIRM_RESTORE:-}" != "si-borra-la-base-destino" ]; then
  echo "Abortado: falta CONFIRM_RESTORE=si-borra-la-base-destino" >&2
  echo "Esto sobrescribiría '$DESTINO' en '$HOST'." >&2
  exit 1
fi

[ -f "$ARCHIVO" ] || { echo "No existe: $ARCHIVO" >&2; exit 1; }

echo "[restore] verificando integridad de $ARCHIVO ..."
gzip -t "$ARCHIVO" || { echo "[restore] el archivo está corrupto" >&2; exit 1; }

echo "[restore] restaurando en $DESTINO@$HOST ..."
gunzip -c "$ARCHIVO" | psql -h "$HOST" -U "$POSTGRES_USER" -d "$DESTINO" -v ON_ERROR_STOP=1 --quiet

echo "[restore] listo. Conteos:"
psql -h "$HOST" -U "$POSTGRES_USER" -d "$DESTINO" -c \
  "SELECT 'contacts' t, count(*) FROM contacts
   UNION ALL SELECT 'user_profiles', count(*) FROM user_profiles
   UNION ALL SELECT 'colonies', count(*) FROM colonies
   UNION ALL SELECT 'electoral_sections', count(*) FROM electoral_sections;"
