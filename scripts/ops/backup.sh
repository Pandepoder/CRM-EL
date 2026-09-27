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
#   - Un volcado solo es bueno si pg_dump terminó bien Y el archivo trae la marca
#     con la que pg_dump cierra todo volcado completo. Ver `volcado_completo`.
#   - Solo se poda después de un volcado bueno: si los respaldos empiezan a
#     fallar, los anteriores se conservan todos hasta que alguien lo arregle.
set -eu
# Sin esto, el resultado de `pg_dump | gzip` era el de gzip. Con la base caída,
# pg_dump fallaba, gzip comprimía la nada y terminaba bien, y el script escribía
# "[backup] ok tonala_os-...sql.gz — 20 bytes": un respaldo que pasa `gzip -t` y
# no trae ni una línea de SQL. Comprobado apuntando a un host que no existe. Tras
# RETENTION días así, la poda habría borrado todos los respaldos buenos.
set -o pipefail

: "${POSTGRES_USER:?falta POSTGRES_USER}"
: "${POSTGRES_DB:?falta POSTGRES_DB}"

DIR=/backups
HOST="${POSTGRES_HOST:-db}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"

# pg_dump cierra todo volcado completo con esta línea. Desde 16.10 la siguen unas
# líneas de "unrestrict", por eso se miran las últimas diez y no solo la última.
# Sin la marca, el volcado se cortó a medias, sea por lo que sea: no es respaldo.
volcado_completo() {
  gunzip -c "$1" 2>/dev/null | tail -n 10 | grep -q -- '-- PostgreSQL database dump complete'
}

mkdir -p "$DIR"
echo "[backup] iniciado — destino=$DIR intervalo=${INTERVAL}s retención=${RETENTION}d"

while true; do
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  tmp="$DIR/.in-progress-$ts.sql.gz"
  final="$DIR/tonala_os-$ts.sql.gz"

  if pg_dump -h "$HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
       --no-owner --no-acl --clean --if-exists 2>/tmp/pg_dump.err | gzip -9 > "$tmp" \
     && volcado_completo "$tmp"; then
    mv "$tmp" "$final"
    echo "[backup] ok $(basename "$final") — $(wc -c < "$final") bytes"
    # `|| true`: con pipefail, un fallo de la poda terminaría el bucle entero, y
    # el respaldo ya se hizo. Que no se pueda podar no es motivo para dejar de respaldar.
    find "$DIR" -name 'tonala_os-*.sql.gz' -type f -mtime +"$RETENTION" -print -delete \
      | sed 's/^/[backup] podado /' || echo "[backup] no se pudo podar; se reintenta en el siguiente ciclo" >&2
  else
    rm -f "$tmp"
    echo "[backup] FALLÓ el volcado $ts (no se guardó nada y no se podó nada):" >&2
    cat /tmp/pg_dump.err >&2 || true
  fi

  # Restos de un contenedor matado a mitad de volcado.
  find "$DIR" -name '.in-progress-*' -type f -mmin +120 -delete 2>/dev/null || true

  sleep "$INTERVAL"
done
