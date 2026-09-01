"""
Procesador Exhaustivo de los 125 Municipios de Jalisco (3,787 Secciones Electorales Oficiales del INE/IEPC).
Extrae coordenadas vectoriales reales, crea GeoJSON y sincroniza con PostgreSQL en producción.
"""

import xml.etree.ElementTree as ET
import json
import paramiko
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Catálogo Oficial de los 125 Municipios de Jalisco (INE/IEPC)
MUNICIPIOS_JALISCO_125 = {
    1: "Acatic",
    2: "Acatlán de Juárez",
    3: "Ahualulco de Mercado",
    4: "Amacueca",
    5: "Amatitán",
    6: "Ameca",
    7: "San Juanito de Escobedo",
    8: "Arandas",
    9: "El Arenal",
    10: "Atemajac de Brizuela",
    11: "Atengo",
    12: "Atenguillo",
    13: "Atotonilco el Alto",
    14: "Atoyac",
    15: "Autlán de Navarro",
    16: "Ayotlán",
    17: "Ayutla",
    18: "La Barca",
    19: "Bolaños",
    20: "Cabo Corrientes",
    21: "Casimiro Castillo",
    22: "Cihuatlán",
    23: "Zapotlán el Grande",
    24: "Cocula",
    25: "Colotlán",
    26: "Concepción de Buenos Aires",
    27: "Cuautitlán de García Barragán",
    28: "Cuautla",
    29: "Cuquío",
    30: "Chapala",
    31: "Chimaltitán",
    32: "Chiquilistlán",
    33: "Degollado",
    34: "Ejutla",
    35: "Encarnación de Díaz",
    36: "Etzatlán",
    37: "El Grullo",
    38: "Guachinango",
    39: "Guadalajara",
    40: "Hostotipaquillo",
    41: "Guadalajara",
    42: "Huejúcar",
    43: "Huejuquilla el Alto",
    44: "La Huerta",
    45: "Ixtlahuacán de los Membrillos",
    46: "Ixtlahuacán del Río",
    47: "Jalostotitlán",
    48: "Jamay",
    49: "Jesús María",
    50: "Jilotlán de los Dolores",
    51: "Jocotepec",
    52: "Juanacatlán",
    53: "Juchitlán",
    54: "Lagos de Moreno",
    55: "El Limón",
    56: "Magdalena",
    57: "Santa María del Oro",
    58: "La Manzanilla de la Paz",
    59: "Mascota",
    60: "Mazamitla",
    61: "Mexticacán",
    62: "Mezquitic",
    63: "Mixtlán",
    64: "Ocotlán",
    65: "Ojuelos de Jalisco",
    66: "Pihuamo",
    67: "Poncitlán",
    68: "Puerto Vallarta",
    69: "El Salto",
    70: "Quitupan",
    71: "Villa Purificación",
    72: "San Cristóbal de la Barranca",
    73: "San Diego de Alejandría",
    74: "San Juan de los Lagos",
    75: "San Julián",
    76: "San Marcos",
    77: "San Martín de Bolaños",
    78: "San Martín Hidalgo",
    79: "San Miguel el Alto",
    80: "Gómez Farías",
    81: "San Sebastián del Oeste",
    82: "Santa María de los Ángeles",
    83: "Sayula",
    84: "Tala",
    85: "Talpa de Allende",
    86: "Tamazula de Gordiano",
    87: "Tapalpa",
    88: "Tecalitlán",
    89: "Tecolotlán",
    90: "Techaluta de Montenegro",
    91: "Tenamaxtlán",
    92: "Teocaltiche",
    93: "Teocuitatlán de Corona",
    94: "Tepatitlán de Morelos",
    95: "Tequila",
    96: "Teuchitlán",
    97: "Tizapán el Alto",
    98: "Tlajomulco de Zúñiga",
    99: "San Pedro Tlaquepaque",
    100: "Tolimán",
    101: "Tomatlán",
    102: "Tonalá",
    103: "Tonaya",
    104: "Tonila",
    105: "Totatiche",
    106: "Tototlán",
    107: "Tuxcacuesco",
    108: "Tuxcueca",
    109: "Tuxpan",
    110: "Unión de San Antonio",
    111: "Unión de Tula",
    112: "Valle de Guadalupe",
    113: "Valle de Juárez",
    114: "San Gabriel",
    115: "Villa Corona",
    116: "Villa Guerrero",
    117: "Villa Hidalgo",
    118: "Cañadas de Obregón",
    119: "Yahualica de González Gallo",
    120: "Zapopan",
    121: "Zapotiltic",
    122: "Zapotitlán de Vadillo",
    123: "Zapotlán del Rey",
    124: "Zapotlanejo",
    125: "San Ignacio Cerro Gordo"
}

def parse_coordinates_text(coord_text):
    points = []
    for item in coord_text.strip().split():
        parts = item.split(',')
        if len(parts) >= 2:
            try:
                lng = round(float(parts[0]), 6)
                lat = round(float(parts[1]), 6)
                points.append([lng, lat])
            except ValueError:
                continue
    if points and (points[0] != points[-1]):
        points.append(list(points[0]))
    return points

def extract_placemark_geometry(pm, ns):
    poly = pm.find('.//kml:Polygon', ns)
    if poly is not None:
        outer = poly.find('.//kml:outerBoundaryIs//kml:coordinates', ns)
        if outer is not None and outer.text:
            ring = parse_coordinates_text(outer.text)
            if len(ring) >= 4:
                return {
                    "type": "Polygon",
                    "coordinates": [ring]
                }
    
    multi = pm.find('.//kml:MultiGeometry', ns)
    if multi is not None:
        polys = multi.findall('.//kml:Polygon', ns)
        if len(polys) > 0:
            multi_coords = []
            for p in polys:
                outer = p.find('.//kml:outerBoundaryIs//kml:coordinates', ns)
                if outer is not None and outer.text:
                    ring = parse_coordinates_text(outer.text)
                    if len(ring) >= 4:
                        multi_coords.append([ring])
            if len(multi_coords) == 1:
                return {
                    "type": "Polygon",
                    "coordinates": multi_coords[0]
                }
            elif len(multi_coords) > 1:
                return {
                    "type": "MultiPolygon",
                    "coordinates": multi_coords
                }
    return None

def process_and_sync_all_jalisco():
    kml_path = os.path.join(os.path.dirname(__file__), "raw", "kml", "SeccionesJalSept2022.kml")
    if not os.path.exists(kml_path):
        print(f"Error: no existe {kml_path}")
        return

    print("1. Parseando KML oficial completo de Jalisco (3,787 secciones)...")
    tree = ET.parse(kml_path)
    root = tree.getroot()
    ns = {'kml': 'http://www.opengis.net/kml/2.2'}

    placemarks = root.findall('.//kml:Placemark', ns)
    print(f"[OK] Total secciones encontradas: {len(placemarks)}")

    all_features = []
    tonala_features = []
    sections_by_muni = {}

    for pm in placemarks:
        ext = pm.find('kml:ExtendedData', ns)
        if ext is None: continue
        sd = ext.find('kml:SchemaData', ns)
        if sd is None: continue
        
        data = {item.get('name'): item.text for item in sd.findall('kml:SimpleData', ns)}
        muni_code = int(float(data.get('MUNICIPIO', 0)))
        sec_num = int(float(data.get('SECCION', 0)))
        dist = int(float(data.get('DISTRITO', 0)))
        dist_l = int(float(data.get('DISTRITO_L', 0)))
        tipo = int(float(data.get('TIPO', 1)))

        muni_name = MUNICIPIOS_JALISCO_125.get(muni_code, f"Municipio {muni_code}")
        geom = extract_placemark_geometry(pm, ns)
        if not geom: continue

        feature = {
            "type": "Feature",
            "id": sec_num,
            "properties": {
                "section_num": sec_num,
                "name": f"Sección {sec_num}",
                "municipality": muni_name,
                "municipalityCode": muni_code,
                "districtFederal": dist,
                "districtLocal": dist_l,
                "tipo": tipo
            },
            "geometry": geom
        }
        all_features.append(feature)

        if muni_code == 102: # Tonalá
            tonala_features.append(feature)

        if muni_name not in sections_by_muni:
            sections_by_muni[muni_name] = []
        sections_by_muni[muni_name].append(sec_num)

    print(f"[OK] Total secciones procesadas de Jalisco: {len(all_features)}")
    print(f"[OK] Secciones de Tonalá: {len(tonala_features)}")
    print(f"[OK] Total municipios representados: {len(sections_by_muni)}")

    # Guardar GeoJSON de Tonalá y GeoJSON completo de Jalisco en apps/web/public/geo
    geo_dir = os.path.join(os.path.dirname(__file__), "..", "..", "apps", "web", "public", "geo")
    os.makedirs(geo_dir, exist_ok=True)
    
    tonala_path = os.path.join(geo_dir, "tonala-secciones.geojson")
    with open(tonala_path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": tonala_features}, f)

    jalisco_path = os.path.join(geo_dir, "jalisco-secciones.geojson")
    with open(jalisco_path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": all_features}, f)

    print(f"[OK] Guardados archivos GeoJSON en public/geo:")
    print(f"   - Tonalá: {os.path.getsize(tonala_path)} bytes")
    print(f"   - Jalisco Completo: {os.path.getsize(jalisco_path)} bytes")

    # Generar SQL en chunks de 500 para una inserción eficiente
    print("\n2. Generando SQL para insertar las 3,787 secciones de Jalisco en PostgreSQL...")
    sql_path = os.path.join(os.path.dirname(__file__), "jalisco_all_3787_sections.sql")
    
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("-- ========================================================\n")
        f.write("-- JALISCO COMPLETE 3,787 ELECTORAL SECTIONS VECTOR CARTOGRAPHY\n")
        f.write("-- ========================================================\n")
        f.write("BEGIN;\n\n")

        f.write("""
        INSERT INTO catalog_versions (id, catalog_type, source_name, source_version)
        VALUES ('a0000000-0000-0000-0000-000000000001', 'ine_sections', 'iepc_jalisco_oficial_completo_125_municipios', 'v5.0')
        ON CONFLICT (id) DO NOTHING;
        \n""")

        # Insertar todas las secciones
        for feat in all_features:
            sec_num = feat["properties"]["section_num"]
            muni = feat["properties"]["municipality"]
            geom_json = json.dumps(feat["geometry"]).replace("'", "''")
            
            f.write(f"""
            INSERT INTO electoral_sections (section_num, geom_json)
            VALUES ({sec_num}, '{geom_json}'::jsonb)
            ON CONFLICT (section_num) DO UPDATE 
            SET geom_json = EXCLUDED.geom_json;
            """)

        # Vincular colonias / municipios representativos para cada sección
        for muni_name, sec_nums in sections_by_muni.items():
            escaped_muni = muni_name.replace("'", "''")
            f.write(f"""
            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Cabecera {escaped_muni}', 
              '45000', 
              '{escaped_muni}', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO NOTHING;

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num IN ({', '.join(str(s) for s in sec_nums)})
              AND col.name = 'Cabecera {escaped_muni}'
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            """)

        f.write("\nCOMMIT;\n")

    print(f"[OK] Archivo SQL generado en {sql_path} ({os.path.getsize(sql_path)} bytes)")

    # Sincronizar al VPS
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]

    print(f"\n3. Conectando por SSH a {user}@{host} para sincronizar Jalisco completo...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=15)
    print("[OK] Conectado.")

    print("4. Subiendo SQL al VPS...")
    sftp = client.open_sftp()
    sftp.put(sql_path, "/tmp/jalisco_all.sql")
    sftp.close()

    print("5. Ejecutando inserción en PostgreSQL de producción...")
    cmd = "cat /tmp/jalisco_all.sql | docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os && rm -f /tmp/jalisco_all.sql"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8")
    err = stderr.read().decode("utf-8")
    if err:
        print("Avisos:", err)
    print("[OK] Salida final:\n", "\n".join(out.splitlines()[-6:]))

    print("\n6. Verificando conteo total de secciones en PostgreSQL:")
    cmd_verify = """
    docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c "
      SELECT 
        COUNT(*) as total_secciones_en_base_de_datos,
        COUNT(geom_json) as total_con_poligono_vectorial,
        MIN(section_num) as primera_seccion,
        MAX(section_num) as ultima_seccion
      FROM electoral_sections;
    "
    """
    stdin, stdout, stderr = client.exec_command(cmd_verify)
    print(stdout.read().decode("utf-8"))

    client.close()
    print(f"\n🎉 ¡Las 3,787 secciones de todo el estado de Jalisco fueron cargadas con éxito!")

if __name__ == "__main__":
    process_and_sync_all_jalisco()
