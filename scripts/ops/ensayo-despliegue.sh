#!/usr/bin/env bash
# Ensayo de un despliegue con migraciones sobre una COPIA de la base de producción, en el mismo
# servidor y sin tocar producción (8.15 de docs/PLAN_ADMIN_MUNICIPAL.md).
#
# Qué hace:
#   1. Construye las imágenes de ESTA copia del código, la versión que se va a desplegar.
#   2. Levanta una base aparte —el proyecto de compose «crm-el-ensayo», con su propia red y su propio
#      volumen, sin puertos publicados— y copia en ella la base de producción con pg_dump, que solo
#      lee. La copia va directo de una base a la otra: no se escribe ningún archivo con el padrón.
#   3. Cuenta las filas de cada tabla, corre `pnpm db:migrate` —lo mismo que hará el despliegue:
#      migraciones y tareas posteriores— y vuelve a contar.
#   4. Arranca la aplicación nueva contra la copia y comprueba que responde sana.
#   5. Borra todo lo del ensayo (contenedores, red, volúmenes con la copia e imágenes), pase lo que
#      pase, también si se interrumpe con Ctrl+C.
#
# De producción solo se lee: la base (pg_dump) y su .env. Nada se detiene ni se modifica. Lo que sí
# usa es CPU, memoria y disco del servidor mientras dura (el build es el mismo del despliegue).
#
# Uso, en el servidor, desde una copia del código nuevo que NO sea la de producción:
#   git clone --depth 1 --branch <rama> https://github.com/Pandepoder/CRM-EL.git /opt/crm-el-ensayo
#   cd /opt/crm-el-ensayo && bash scripts/ops/ensayo-despliegue.sh
#
# Variables opcionales: PRODUCCION_DIR (/opt/crm-el), ORIGEN_CONTENEDOR (tonala-os-postgres),
# PROYECTO_ENSAYO (crm-el-ensayo).
set -euo pipefail

AQUI="$(cd "$(dirname "$0")/../.." && pwd)"
PRODUCCION="${PRODUCCION_DIR:-/opt/crm-el}"
ORIGEN="${ORIGEN_CONTENEDOR:-tonala-os-postgres}"
PROYECTO="${PROYECTO_ENSAYO:-crm-el-ensayo}"

falla() { echo; echo "✗ $*" >&2; exit 1; }
titulo() { echo; echo "== $*"; }

# --- Antes de tocar nada ------------------------------------------------------------------------
[ -f "$PRODUCCION/.env" ] || falla "No encuentro $PRODUCCION/.env (la configuración de producción)."
PRODUCCION="$(cd "$PRODUCCION" && pwd)"
[ "$AQUI" != "$PRODUCCION" ] || falla "Esto se corre desde otra copia del código, no desde $PRODUCCION."
case "$PROYECTO" in
  crm-el|"$(basename "$PRODUCCION")") falla "El proyecto del ensayo no puede llamarse como el de producción." ;;
esac
command -v docker >/dev/null || falla "No hay docker."
version="$(docker compose version --short 2>/dev/null | sed 's/^v//')"
[ -n "$version" ] || falla "No hay Docker Compose v2."
if [ "$(printf '%s\n' "2.24.4" "$version" | sort -V | head -n1)" != "2.24.4" ]; then
  falla "Docker Compose $version es anterior a 2.24.4 y no entiende scripts/ops/ensayo.override.yml."
fi
[ "$(docker inspect -f '{{.State.Running}}' "$ORIGEN" 2>/dev/null)" = "true" ] || falla "El contenedor $ORIGEN no está corriendo."
libre_kb="$(df -Pk "$AQUI" | awk 'NR==2 {print $4}')"
[ "$libre_kb" -ge $((6 * 1024 * 1024)) ] || falla "Hay $((libre_kb / 1024 / 1024)) GB libres; el ensayo necesita unos 6."

valor_env() { # el valor de una variable del .env de producción, sin comillas
  grep -E "^$1=" "$PRODUCCION/.env" | tail -n1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || true
}
PGU="$(valor_env POSTGRES_USER)"; PGU="${PGU:-tonala}"
PGD="$(valor_env POSTGRES_DB)"; PGD="${PGD:-tonala_os}"

# compose lee el .env de la carpeta del proyecto: se enlaza el de producción, sin copiarlo.
ENLAZADO=0
if [ ! -e "$AQUI/.env" ]; then ln -s "$PRODUCCION/.env" "$AQUI/.env"; ENLAZADO=1
elif [ "$(readlink -f "$AQUI/.env")" != "$(readlink -f "$PRODUCCION/.env")" ]; then
  falla "$AQUI/.env existe y no es el de producción; quítalo y vuelve a correr el ensayo."
fi

dc() { docker compose -p "$PROYECTO" -f "$AQUI/docker-compose.yml" -f "$AQUI/scripts/ops/ensayo.override.yml" "$@"; }
TMP="$(mktemp -d)"; chmod 700 "$TMP"
limpiar() {
  echo; echo "== Limpiando el ensayo (contenedores, red, volúmenes con la copia e imágenes)"
  dc down -v --remove-orphans --rmi local >/dev/null 2>&1 || echo "  no se pudo limpiar todo: docker compose -p $PROYECTO down -v" >&2
  [ "$ENLAZADO" = 1 ] && rm -f "$AQUI/.env"
  rm -rf "$TMP"
}
trap limpiar EXIT
trap 'exit 130' INT TERM
if [ -n "$(docker ps -aq --filter "label=com.docker.compose.project=$PROYECTO")" ]; then
  echo "Quedaban contenedores de un ensayo anterior: se borran."
  dc down -v --remove-orphans >/dev/null 2>&1 || true
fi

echo "Ensayo de despliegue — código en $AQUI ($(git -C "$AQUI" rev-parse --short HEAD 2>/dev/null || echo 'sin git'))"
echo "Producción: $PRODUCCION, base «$PGD» en el contenedor $ORIGEN. Solo se lee."

titulo "1/5 Construyendo las imágenes de la versión nueva (varios minutos)"
dc build migrate web >"$TMP/build.log" 2>&1 || { tail -n 40 "$TMP/build.log"; falla "El build falló: el despliegue fallaría igual."; }
echo "  listo"

titulo "2/5 Copiando la base de producción a la base del ensayo"
dc up -d db >/dev/null 2>&1
for _ in $(seq 1 60); do dc exec -T db pg_isready -U "$PGU" -d "$PGD" >/dev/null 2>&1 && break; sleep 2; done
dc exec -T db pg_isready -U "$PGU" -d "$PGD" >/dev/null 2>&1 || falla "La base del ensayo no arrancó."
inicio=$(date +%s)
docker exec "$ORIGEN" pg_dump -U "$PGU" -d "$PGD" --no-owner --no-privileges \
  | dc exec -T db psql -U "$PGU" -d "$PGD" -q -v ON_ERROR_STOP=1 >/dev/null \
  || falla "No se pudo copiar la base."
echo "  copiada en $(( $(date +%s) - inicio )) s"

psql_ensayo() { dc exec -T db psql -U "$PGU" -d "$PGD" -At "$@"; }
contar() {
  psql_ensayo -q <<'SQL'
DO $$
DECLARE r record; n bigint;
BEGIN
  CREATE TEMP TABLE _conteos(tabla text, filas bigint);
  FOR r IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('public', 'drizzle') LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', r.schemaname, r.tablename) INTO n;
    INSERT INTO _conteos VALUES (r.schemaname || '.' || r.tablename, n);
  END LOOP;
END $$;
SELECT tabla || ' ' || filas FROM _conteos ORDER BY tabla;
SQL
}
contar >"$TMP/antes.txt"
ultima="$(psql_ensayo -c 'SELECT coalesce(max(created_at), 0) FROM drizzle.__drizzle_migrations' | tr -d '[:space:]')"
filas() { awk -v t="public.$1" '$1==t {print $2}' "$TMP/antes.txt"; }
echo "  $(wc -l <"$TMP/antes.txt") tablas; $(filas contacts) ciudadanos, $(filas user_profiles) cuentas, $(filas event_reports) incidencias"
echo "  Migraciones que faltan en producción:"
dc run --rm --no-deps -T -e ULTIMA="$ultima" --entrypoint node migrate -e '
  const j = require("./db/migrations/meta/_journal.json");
  const faltan = j.entries.filter((e) => e.when > Number(process.env.ULTIMA));
  console.log(faltan.length ? faltan.map((e) => "    " + e.tag).join("\n") : "    ninguna");
' 2>/dev/null

titulo "3/5 Migrando la copia (pnpm db:migrate, como en el despliegue)"
inicio=$(date +%s)
if dc run --rm -T migrate >"$TMP/migrate.log" 2>&1; then migro=1; else migro=0; fi
duracion=$(( $(date +%s) - inicio ))
sed -e '/^\$ /d' -e '/^ *Container /d' -e 's/^/  │ /' "$TMP/migrate.log"
[ "$migro" = 1 ] || falla "LA MIGRACIÓN FALLÓ tras ${duracion} s. En un despliegue, el sitio quedaría caído (web espera a migrate). No despliegues; manda esta salida."
echo "  migró en ${duracion} s (en el despliegue, el sitio no responde durante ese tiempo más el arranque de web)"

contar >"$TMP/despues.txt"
echo "  Filas por tabla (antes → después):"
inesperados=0
while read -r tabla despues; do
  antes="$(awk -v t="$tabla" '$1==t {print $2}' "$TMP/antes.txt")"
  if [ -z "$antes" ]; then echo "    + $tabla: tabla nueva, $despues filas"
  elif [ "$antes" != "$despues" ]; then
    case "$tabla" in
      # Esperados: el registro de migraciones y la auditoría de lo que hace db:migrate
      # (nombrar al maestro queda auditado).
      drizzle.__drizzle_migrations|public.audit_logs) echo "    · $tabla: $antes → $despues (esperado)" ;;
      *) echo "    ✗ $tabla: $antes → $despues (INESPERADO)"; inesperados=$((inesperados + 1)) ;;
    esac
  fi
done <"$TMP/despues.txt"
while read -r tabla antes; do
  grep -q "^$tabla " "$TMP/despues.txt" || { echo "    ✗ $tabla desapareció ($antes filas)"; inesperados=$((inesperados + 1)); }
done <"$TMP/antes.txt"
[ "$inesperados" = 0 ] && echo "    ninguna otra tabla cambió de filas"
[ "$inesperados" = 0 ] || falla "La migración cambió filas que no debía tocar. No despliegues; manda esta salida."

titulo "4/5 Arrancando la aplicación nueva contra la copia"
dc up -d --no-deps web >/dev/null 2>&1
sano=0
for _ in $(seq 1 60); do
  if dc exec -T web node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(t=>{process.stdout.write(t);process.exit(t.includes('\"status\":\"ok\"')?0:1)}).catch(()=>process.exit(1))" >"$TMP/salud.txt" 2>/dev/null; then sano=1; break; fi
  sleep 2
done
[ "$sano" = 1 ] || { dc logs --tail=40 web; falla "La aplicación nueva no respondió sana contra la copia."; }
echo "  /api/health: $(cat "$TMP/salud.txt")"
login="$(dc exec -T web node -e "fetch('http://127.0.0.1:3000/login').then(r=>console.log(r.status)).catch(()=>console.log(0))" 2>/dev/null | tr -d '[:space:]')"
entrar="$(dc exec -T web node -e "fetch('http://127.0.0.1:3000/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'ensayo-no-existe@example.invalid',password:'x'})}).then(r=>console.log(r.status)).catch(()=>console.log(0))" 2>/dev/null | tr -d '[:space:]')"
echo "  /login: $login · entrar con una cuenta que no existe: $entrar (debe ser 401)"
[ "$login" = 200 ] && [ "$entrar" = 401 ] || falla "La aplicación nueva responde, pero no como debe."
errores="$(dc logs web 2>&1 | grep -ciE '"level":"error"|unhandled|TypeError|ReferenceError' || true)"
[ "$errores" = 0 ] || { dc logs --tail=40 web; falla "La aplicación nueva registró $errores error(es) al arrancar."; }

titulo "5/5 Resultado"
echo "✓ ENSAYO CORRECTO: la migración y la aplicación nueva funcionan con los datos de producción."
echo "  Revisa arriba el informe de db:migrate (maestro, municipios en General, huellas) antes de desplegar."
