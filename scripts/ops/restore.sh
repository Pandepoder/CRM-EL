#!/bin/sh
# Restaura un respaldo de Tonalá OS en una base VACÍA (la crea si no existe).
#
#   docker compose run --rm --entrypoint sh \
#     -e RESTORE_TARGET_DB=tonala_os_restaurada \
#     backup /usr/local/bin/restore.sh /backups/tonala_os-<TS>.sql.gz
#
# El `--entrypoint sh` NO es opcional: `compose run` sustituye el command, no el
# entrypoint, así que sin él arranca el bucle de respaldo y se queda colgado.
#
# Por qué solo en una base vacía: `pg_dump --clean` borra únicamente los objetos
# que trae el volcado. Restaurar un respaldo viejo encima de la base viva dejaba
# en pie las tablas que crearon las migraciones posteriores al respaldo, mientras
# el registro de migraciones volvía atrás; el siguiente `db:migrate` las intentaba
# crear otra vez. Comprobado: tras restaurar encima, 20 migraciones registradas y
# la tabla de la 21 todavía ahí. En una base vacía eso no puede pasar, y la base
# anterior se conserva intacta hasta que alguien decida cambiarlas de nombre
# (el README trae el procedimiento, con el cambio de nombres en una transacción).
#
# Por eso ya no hace falta CONFIRM_RESTORE: este script nunca sobrescribe nada.
#
# Un respaldo que nunca se restauró no es un respaldo, es un archivo. Correr
# esto contra una base de prueba es parte del procedimiento, no un extra.
set -eu
# Sin pipefail, `gunzip | psql` terminaba con el resultado de psql aunque gunzip
# fallara a medias, y el script decía "listo" tras restaurar solo una parte.
set -o pipefail

ARCHIVO="${1:?uso: restore.sh <ruta-del-.sql.gz>}"
: "${POSTGRES_USER:?falta POSTGRES_USER}"
: "${POSTGRES_DB:?falta POSTGRES_DB}"

HOST="${POSTGRES_HOST:-db}"
DESTINO="${RESTORE_TARGET_DB:-$POSTGRES_DB}"

# El nombre va sin comillas en CREATE DATABASE: solo se admite un identificador simple.
case "$DESTINO" in
  "" | [!a-z_]* | *[!a-z0-9_]*)
    echo "[restore] nombre de base no válido: '$DESTINO' (solo minúsculas, dígitos y _)" >&2
    exit 1 ;;
esac

consulta() { psql -h "$HOST" -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 -Atq "$@"; }

[ -f "$ARCHIVO" ] || { echo "No existe: $ARCHIVO" >&2; exit 1; }

echo "[restore] verificando integridad de $ARCHIVO ..."
gzip -t "$ARCHIVO" || { echo "[restore] el archivo está corrupto" >&2; exit 1; }
# `gzip -t` no basta: un volcado vacío o cortado es un gzip perfectamente válido.
# Se exige la línea con la que pg_dump cierra todo volcado completo (desde 16.10
# la siguen unas líneas de "unrestrict", por eso se miran las últimas diez).
if ! gunzip -c "$ARCHIVO" | tail -n 10 | grep -q -- '-- PostgreSQL database dump complete'; then
  echo "[restore] el volcado está incompleto (no termina como termina un pg_dump): no se restaura." >&2
  echo "          No se tocó '$DESTINO'. Usa otro respaldo." >&2
  exit 1
fi

if [ -z "$(consulta -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DESTINO'")" ]; then
  echo "[restore] creando la base vacía $DESTINO ..."
  consulta -d postgres -c "CREATE DATABASE $DESTINO"
fi

tablas=$(consulta -d "$DESTINO" -c \
  "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')")
if [ "$tablas" != "0" ]; then
  echo "[restore] '$DESTINO' no está vacía ($tablas tablas): no se restaura encima." >&2
  echo "          Restaura en una base nueva, p. ej. -e RESTORE_TARGET_DB=${POSTGRES_DB}_restaurada," >&2
  echo "          y luego cambia los nombres como indica el README (Respaldos y Restauración)." >&2
  exit 1
fi

echo "[restore] restaurando en $DESTINO@$HOST ..."
# -o /dev/null: sin él se imprimen los resultados de set_config y setval del volcado,
# que no dicen nada a quien restaura. Los errores siguen saliendo por stderr.
if ! gunzip -c "$ARCHIVO" | psql -h "$HOST" -U "$POSTGRES_USER" -d "$DESTINO" \
       -v ON_ERROR_STOP=1 --quiet -o /dev/null; then
  echo "[restore] FALLÓ a medias: '$DESTINO' quedó incompleta y no debe usarse." >&2
  echo "          Bórrala antes de reintentar: DROP DATABASE $DESTINO;" >&2
  exit 1
fi

echo "[restore] listo. Conteos:"
psql -h "$HOST" -U "$POSTGRES_USER" -d "$DESTINO" -c \
  "SELECT 'contacts' t, count(*) FROM contacts
   UNION ALL SELECT 'user_profiles', count(*) FROM user_profiles
   UNION ALL SELECT 'colonies', count(*) FROM colonies
   UNION ALL SELECT 'electoral_sections', count(*) FROM electoral_sections;"
