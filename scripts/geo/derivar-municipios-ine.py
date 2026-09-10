"""Deriva la tabla codigo INE -> municipio de Jalisco a partir de la propia cartografia.

Por que existe
--------------
La cartografia de secciones viene de los KML del INE, que traen el codigo numerico de
municipio (campo MUNICIPIO) pero no su nombre. El nombre lo ponia a mano el diccionario
MUNICIPIOS_JALISCO_125 de process-all-jalisco-sections.py, y ese diccionario esta mal: asigna
"Guadalajara" a los codigos 39 y 41, omite Zacoalco de Torres y desplaza los nombres de
buena parte del estado. El codigo que contiene la cabecera de Puerto Vallarta quedaba
rotulado "El Salto", el de El Salto "San Cristobal de la Barranca", el de Chapala
"Chimaltitan". La geometria estaba bien; los nombres, corridos.

El INE numera los municipios con su propio orden, que no coincide con el de INEGI ni con
ningun orden alfabetico (se probaron cinco reglas: ninguna reproduce mas de 2 de 10 codigos
verificados). En vez de adivinar la tabla, este script pregunta a OpenStreetMap en que
municipio cae un punto interior de la seccion mas central de cada codigo.

Validacion
----------
El resultado solo se escribe si:
  - los 125 codigos quedan resueltos,
  - la correspondencia con los 125 nombres oficiales es uno a uno,
  - y los 10 codigos verificados por la ubicacion de su cabecera coinciden.
Si algo falla, se escribe el informe parcial y el proceso termina con error.

Uso: python scripts/geo/derivar-municipios-ine.py   (~3 minutos: Nominatim admite 1 req/s)
"""

from __future__ import annotations

import collections
import json
import pathlib
import statistics
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parents[2]
GEOJSON = RAIZ / "apps/web/public/geo/jalisco-secciones.geojson"
DESTINO = RAIZ / "scripts/geo/municipios-ine-jalisco.json"
INFORME = RAIZ / "scripts/geo/municipios-ine-jalisco.informe.json"
USER_AGENT = "Tonala-OS-CRM/1.0 (territorial-planning-system; reparacion de catalogo)"

# Los 125 municipios de Jalisco (nombres vigentes, INEGI).
OFICIALES = """Acatic|Acatlán de Juárez|Ahualulco de Mercado|Amacueca|Amatitán|Ameca|San Juanito de Escobedo|Arandas|El Arenal|Atemajac de Brizuela|Atengo|Atenguillo|Atotonilco el Alto|Atoyac|Autlán de Navarro|Ayotlán|Ayutla|La Barca|Bolaños|Cabo Corrientes|Casimiro Castillo|Cihuatlán|Zapotlán el Grande|Cocula|Colotlán|Concepción de Buenos Aires|Cuautitlán de García Barragán|Cuautla|Cuquío|Chapala|Chimaltitán|Chiquilistlán|Degollado|Ejutla|Encarnación de Díaz|Etzatlán|El Grullo|Guachinango|Guadalajara|Hostotipaquillo|Huejúcar|Huejuquilla el Alto|La Huerta|Ixtlahuacán de los Membrillos|Ixtlahuacán del Río|Jalostotitlán|Jamay|Jesús María|Jilotlán de los Dolores|Jocotepec|Juanacatlán|Juchitlán|Lagos de Moreno|El Limón|Magdalena|Santa María del Oro|La Manzanilla de la Paz|Mascota|Mazamitla|Mexticacán|Mezquitic|Mixtlán|Ocotlán|Ojuelos de Jalisco|Pihuamo|Poncitlán|Puerto Vallarta|Villa Purificación|Quitupan|El Salto|San Cristóbal de la Barranca|San Diego de Alejandría|San Juan de los Lagos|San Julián|San Marcos|San Martín de Bolaños|San Martín Hidalgo|San Miguel el Alto|Gómez Farías|San Sebastián del Oeste|Santa María de los Ángeles|Sayula|Tala|Talpa de Allende|Tamazula de Gordiano|Tapalpa|Tecalitlán|Techaluta de Montenegro|Tecolotlán|Tenamaxtlán|Teocaltiche|Teocuitatlán de Corona|Tepatitlán de Morelos|Tequila|Teuchitlán|Tizapán el Alto|Tlajomulco de Zúñiga|San Pedro Tlaquepaque|Tolimán|Tomatlán|Tonalá|Tonaya|Tonila|Totatiche|Tototlán|Tuxcacuesco|Tuxcueca|Tuxpan|Unión de San Antonio|Unión de Tula|Valle de Guadalupe|Valle de Juárez|San Gabriel|Villa Corona|Villa Guerrero|Villa Hidalgo|Cañadas de Obregón|Yahualica de González Gallo|Zacoalco de Torres|Zapopan|Zapotiltic|Zapotitlán de Vadillo|Zapotlán del Rey|Zapotlanejo|San Ignacio Cerro Gordo""".split("|")

# Codigos cuyo municipio se verifico por la posicion de su cabecera (punto dentro de una
# seccion de ese codigo). Si OpenStreetMap contradice alguno, algo esta mal y no se escribe.
ANCLAS = {
    41: "Guadalajara", 102: "Tonalá", 120: "Zapopan", 94: "Tepatitlán de Morelos",
    69: "Puerto Vallarta", 72: "El Salto", 55: "Lagos de Moreno", 65: "Ocotlán",
    31: "Chapala", 26: "Colotlán",
}

# Como escribe OpenStreetMap algunos municipios, cuando no coincide con el nombre oficial.
ALIAS = {
    "tlaquepaque": "San Pedro Tlaquepaque",
    "ciudad guzman": "Zapotlán el Grande",
    "purificacion": "Villa Purificación",
    "canadas de obregon": "Cañadas de Obregón",
    "villa obregon": "Cañadas de Obregón",
    "antonio escobedo": "San Juanito de Escobedo",
    "san juanito escobedo": "San Juanito de Escobedo",
    "venustiano carranza": "San Gabriel",
    "manuel m. dieguez": "Santa María de los Ángeles",
}


def norm(texto: str) -> str:
    t = unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode().lower().strip()
    for prefijo in ("municipio de ", "mpio. de ", "municipio "):
        if t.startswith(prefijo):
            t = t[len(prefijo):]
    return t


POR_NORM = {norm(n): n for n in OFICIALES}


def a_oficial(texto: str | None) -> str | None:
    if not texto:
        return None
    t = norm(texto)
    if t in POR_NORM:
        return POR_NORM[t]
    if t in ALIAS:
        return ALIAS[t]
    return None


def anillo_exterior(geom: dict) -> list:
    if geom["type"] == "Polygon":
        return geom["coordinates"][0]
    return max((p[0] for p in geom["coordinates"]), key=len)


def dentro(lng: float, lat: float, anillo: list) -> bool:
    c = False
    n = len(anillo)
    for i in range(n):
        x1, y1 = anillo[i]
        x2, y2 = anillo[(i + 1) % n]
        if (y1 > lat) != (y2 > lat) and lng < (x2 - x1) * (lat - y1) / ((y2 - y1) or 1e-15) + x1:
            c = not c
    return c


def punto_interior(feature: dict) -> tuple[float, float] | None:
    anillo = anillo_exterior(feature["geometry"])
    xs = [p[0] for p in anillo]
    ys = [p[1] for p in anillo]
    candidatos = [
        (sum(xs) / len(xs), sum(ys) / len(ys)),
        ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2),
    ]
    mitad = len(anillo) // 2
    candidatos.append(((anillo[0][0] + anillo[mitad][0]) / 2, (anillo[0][1] + anillo[mitad][1]) / 2))
    for lng, lat in candidatos:
        if dentro(lng, lat, anillo):
            return lng, lat
    return None


def preguntar_osm(lat: float, lng: float) -> dict:
    params = urllib.parse.urlencode({
        "format": "json", "lat": f"{lat:.6f}", "lon": f"{lng:.6f}",
        "zoom": 10, "addressdetails": 1, "accept-language": "es",
    })
    req = urllib.request.Request(
        f"https://nominatim.openstreetmap.org/reverse?{params}", headers={"User-Agent": USER_AGENT}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.load(r).get("address", {}) or {}
    except Exception as e:  # red caida o limite: se informa, no se inventa
        return {"_error": str(e)}
    finally:
        time.sleep(1.1)


def municipio_de(direccion: dict) -> str | None:
    for campo in ("county", "municipality", "city", "town", "village", "state_district"):
        oficial = a_oficial(direccion.get(campo))
        if oficial:
            return oficial
    return None


def main() -> int:
    datos = json.loads(GEOJSON.read_text(encoding="utf-8"))
    por_codigo: dict[int, list] = collections.defaultdict(list)
    for f in datos["features"]:
        por_codigo[int(f["properties"]["municipalityCode"])].append(f)

    resultado: dict[int, dict] = {}
    for n, codigo in enumerate(sorted(por_codigo), 1):
        secciones = por_codigo[codigo]
        con_punto = [(f, punto_interior(f)) for f in secciones]
        con_punto = [(f, p) for f, p in con_punto if p]
        med_lng = statistics.median(p[0] for _, p in con_punto)
        med_lat = statistics.median(p[1] for _, p in con_punto)
        # La seccion mas central del codigo: lejos de los bordes con el municipio vecino.
        con_punto.sort(key=lambda fp: (fp[1][0] - med_lng) ** 2 + (fp[1][1] - med_lat) ** 2)

        votos: collections.Counter = collections.Counter()
        muestras = []
        for f, (lng, lat) in con_punto[:3]:
            direccion = preguntar_osm(lat, lng)
            oficial = municipio_de(direccion)
            muestras.append({"seccion": f["properties"]["section_num"], "osm": direccion.get("county")
                             or direccion.get("municipality") or direccion.get("city") or direccion.get("_error"),
                             "oficial": oficial})
            if oficial:
                votos[oficial] += 1
            # Con una respuesta clara basta; se piden mas solo si la primera no resolvio.
            if oficial and votos[oficial] >= 1 and len(muestras) == 1:
                break

        elegido = votos.most_common(1)[0][0] if votos else None
        resultado[codigo] = {
            "code": codigo,
            "name": elegido,
            "nombreAnterior": secciones[0]["properties"]["municipality"],
            "secciones": len(secciones),
            "muestras": muestras,
        }
        marca = "OK " if elegido else "???"
        print(f"  [{n:3d}/125] {marca} cod {codigo:3d} -> {elegido or '(sin resolver)'}"
              f"   (antes: {resultado[codigo]['nombreAnterior']})", flush=True)

    sin_resolver = [c for c, r in resultado.items() if not r["name"]]
    usados = collections.Counter(r["name"] for r in resultado.values() if r["name"])
    repetidos = {nombre: [c for c, r in resultado.items() if r["name"] == nombre]
                 for nombre, k in usados.items() if k > 1}
    faltantes = sorted(set(OFICIALES) - set(usados))
    anclas_mal = {c: (esperado, resultado.get(c, {}).get("name")) for c, esperado in ANCLAS.items()
                  if resultado.get(c, {}).get("name") != esperado}
    corregidos = sum(1 for r in resultado.values() if r["name"] and r["name"] != r["nombreAnterior"])

    informe = {
        "codigos": len(resultado), "sinResolver": sin_resolver, "repetidos": repetidos,
        "faltantes": faltantes, "anclasQueNoCoinciden": anclas_mal, "nombresCorregidos": corregidos,
        "detalle": [resultado[c] for c in sorted(resultado)],
    }
    INFORME.write_text(json.dumps(informe, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"\nsin resolver: {sin_resolver}\nrepetidos: {repetidos}\nfaltantes: {faltantes}"
          f"\nanclas que no coinciden: {anclas_mal}\nnombres que cambian: {corregidos}")

    if sin_resolver or repetidos or faltantes or anclas_mal or len(resultado) != 125:
        print(f"\nNO se escribe la tabla: la validacion fallo. Revisa {INFORME.name}.")
        return 1

    tabla = [{"code": c, "name": resultado[c]["name"]} for c in sorted(resultado)]
    DESTINO.write_text(json.dumps(tabla, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"\nTabla validada escrita en {DESTINO.relative_to(RAIZ)}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
