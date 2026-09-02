#!/bin/sh
# Respaldo periódico de la base de Tonalá OS.
#
# Corre dentro del servicio `backup` de docker-compose.yml, en bucle: vuelca,
# comprime, poda y duerme. No usa cron para no depender de un demonio más
# dentro del contenedor.
#
# Decisiones que importan:
#   - El dump se escribe primero como `.in-progress-*` y solo al terminar bien
#     se renombra. Así un archivo `tonala_os-*.sql.gz` SIEMPRE está completo:
#     nunca se restaura un volcado a medias creído bueno.
#   - `--clean --if-exists` deja el dump listo para restaurar sobre una base ya
#     existente sin borrarla a mano antes.
#   - Un fallo no mata el contenedor: se registra y se reintenta al siguiente
#     ciclo. Un backup que se cae y no vuelve es peor que uno que reintenta.
set -eu

: "${POSTGRES_USER:?falta POSTGRES_USER}"
: "${POSTGRES_DB:?falta POSTGRES_DB}"

DIR=/backups
HOST="${POSTGRES_HOST:-db}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$DIR"
echo "[backup] iniciado — destino=$DIR intervalo=${INTERVAL}s retención=${RETENTION}d"

while true; do
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  tmp="$DIR/.in-progress-$ts.sql.gz"
  final="$DIR/tonala_os-$ts.sql.gz"

  if pg_dump -h "$HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
       --no-owner --no-acl --clean --if-exists 2>/tmp/pg_dump.err | gzip -9 > "$tmp"; then
    mv "$tmp" "$final"
    echo "[backup] ok $(basename "$final") — $(wc -c < "$final") bytes"
    find "$DIR" -name 'tonala_os-*.sql.gz' -type f -mtime +"$RETENTION" -print -delete \
      | sed 's/^/[backup] podado /'
  else
    rm -f "$tmp"
    echo "[backup] FALLÓ el volcado $ts:" >&2
    cat /tmp/pg_dump.err >&2 || true
  fi

  # Restos de un contenedor matado a mitad de volcado.
  find "$DIR" -name '.in-progress-*' -type f -mmin +120 -delete 2>/dev/null || true

  sleep "$INTERVAL"
done
