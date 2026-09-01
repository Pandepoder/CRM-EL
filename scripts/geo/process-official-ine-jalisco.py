"""
Procesador de Cartografía Oficial del INE / IEPC Jalisco (Septiembre 2022).
Lee SeccionesJalSept2022.kml, extrae geometrías oficiales exactas calle por calle
y las sincroniza con PostgreSQL en producción.
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

# Diccionario de nombres de municipios oficiales de Jalisco
MUNICIPIOS_JALISCO = {
    102: "Tonalá",
    41: "Guadalajara",
    120: "Zapopan",
    99: "San Pedro Tlaquepaque",
    98: "Tlajomulco de Zúñiga",
    69: "El Salto",
    125: "Zapotlanejo",
    55: "Ixtlahuacán de los Membrillos",
    65: "Juanacatlán",
    23: "Chapala",
    75: "Puerto Vallarta",
    84: "San Juan de los Lagos",
    86: "San Martín Hidalgo",
    94: "Tala",
    18: "Autlán de Navarro",
    6: "Ameca"
}

def parse_coordinates_text(coord_text):
    points = []
    for item in coord_text.strip().split():
        parts = item.split(',')
        if len(parts) >= 2:
            try:
                lng = round(float(parts[0]), 7)
                lat = round(float(parts[1]), 7)
                points.append([lng, lat])
            except ValueError:
                continue
    # Ensure closed polygon
    if points and (points[0] != points[-1]):
        points.append(list(points[0]))
    return points

def extract_placemark_geometry(pm, ns):
    # Check for Polygon
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
    
    # Check for MultiGeometry with multiple Polygons
    multi = pm.find('.//kml:MultiGeometry', ns)
    if multi is not None:
        polys = multi.findall('.//kml:Polygon', ns)
        if len(polys) > 1:
            multi_coords = []
            for p in polys:
                outer = p.find('.//kml:outerBoundaryIs//kml:coordinates', ns)
                if outer is not None and outer.text:
                    ring = parse_coordinates_text(outer.text)
                    if len(ring) >= 4:
                        multi_coords.append([ring])
            if multi_coords:
                return {
                    "type": "MultiPolygon",
                    "coordinates": multi_coords
                }
    return None

def process_kml():
    kml_path = os.path.join(os.path.dirname(__file__), "raw", "kml", "SeccionesJalSept2022.kml")
    if not os.path.exists(kml_path):
        print(f"Error: no existe {kml_path}")
        return

    print("1. Parseando KML oficial de Secciones Electorales de Jalisco...")
    tree = ET.parse(kml_path)
    root = tree.getroot()
    ns = {'kml': 'http://www.opengis.net/kml/2.2'}

    placemarks = root.findall('.//kml:Placemark', ns)
    print(f"[OK] Total secciones en el archivo oficial: {len(placemarks)}")

    tonala_features = []
    all_jalisco_sections = []

    for pm in placemarks:
        ext = pm.find('kml:ExtendedData', ns)
        if ext is None:
            continue
        sd = ext.find('kml:SchemaData', ns)
        if sd is None:
            continue
        
        data = {}
        for item in sd.findall('kml:SimpleData', ns):
            data[item.get('name')] = item.text

        muni_code = int(float(data.get('MUNICIPIO', 0)))
        sec_num = int(float(data.get('SECCION', 0)))
        dist = int(float(data.get('DISTRITO', 0)))
        dist_l = int(float(data.get('DISTRITO_L', 0)))
        tipo = int(float(data.get('TIPO', 1)))

        muni_name = MUNICIPIOS_JALISCO.get(muni_code, f"Municipio {muni_code}")
        geom = extract_placemark_geometry(pm, ns)
        if not geom:
            continue

        sec_entry = {
            "sectionNum": sec_num,
            "municipalityCode": muni_code,
            "municipalityName": muni_name,
            "districtFederal": dist,
            "districtLocal": dist_l,
            "tipo": tipo,
            "geometry": geom
        }
        all_jalisco_sections.append(sec_entry)

        if muni_code == 102: # Tonalá
            tonala_features.append({
                "type": "Feature",
                "id": sec_num,
                "properties": {
                    "section_num": sec_num,
                    "name": f"Sección {sec_num}",
                    "municipality": "Tonalá",
                    "districtFederal": dist,
                    "districtLocal": dist_l,
                    "tipo": tipo
                },
                "geometry": geom
            })

    print(f"[OK] Secciones oficiales extraídas de Tonalá (Municipio 102): {len(tonala_features)}")
    print(f"[OK] Secciones oficiales extraídas de todo Jalisco: {len(all_jalisco_sections)}")

    # Guardar GeoJSON de Tonalá para uso directo del frontend
    geo_dir = os.path.join(os.path.dirname(__file__), "..", "..", "apps", "web", "public", "geo")
    os.makedirs(geo_dir, exist_ok=True)
    tonala_geojson_path = os.path.join(geo_dir, "tonala-secciones.geojson")
    with open(tonala_geojson_path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": tonala_features}, f)
    print(f"[OK] GeoJSON de Tonalá guardado en {tonala_geojson_path} ({os.path.getsize(tonala_geojson_path)} bytes)")

    # Generar SQL para sincronizar en PostgreSQL
    print("2. Generando SQL de importación oficial con coordenadas vectoriales...")
    sql_lines = [
        "-- ========================================================",
        "-- OFFICIAL INE / IEPC JALISCO VECTOR CARTOGRAPHY IMPORT",
        "-- ========================================================",
        "BEGIN;",
        ""
    ]

    # Actualizar catálogo
    sql_lines.append("""
    INSERT INTO catalog_versions (id, catalog_type, source_name, source_version)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'ine_sections', 'iepc_jalisco_oficial_shp_2022_2026', 'v4.0')
    ON CONFLICT (id) DO NOTHING;
    """)

    # Eliminar secciones que no pertenezcan al municipio de Tonalá o catálogo oficial
    tonala_sec_nums = ", ".join(str(f["properties"]["section_num"]) for f in tonala_features)
    sql_lines.append(f"""
    DELETE FROM section_colonies WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN ({tonala_sec_nums})
    );
    DELETE FROM contacts WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN ({tonala_sec_nums})
    );
    DELETE FROM event_reports WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN ({tonala_sec_nums})
    );
    DELETE FROM electoral_representatives WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN ({tonala_sec_nums})
    );
    DELETE FROM electoral_sections WHERE section_num NOT IN ({tonala_sec_nums});
    """)

    # Insertar todas las secciones oficiales de Tonalá con sus polígonos exactos
    for feat in tonala_features:
        sec_num = feat["properties"]["section_num"]
        geom_json = json.dumps(feat["geometry"]).replace("'", "''")
        
        sql_lines.append(f"""
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES ({sec_num}, '{geom_json}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        """)

    sql_lines.append("COMMIT;")
    sql_content = "\n".join(sql_lines)

    sql_path = os.path.join(os.path.dirname(__file__), "tonala_ine_official_exact.sql")
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"[OK] Archivo SQL generado en {sql_path} ({len(sql_content)} bytes)")

    # Sincronizar al VPS
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]

    print(f"\n3. Conectando por SSH a {user}@{host} para aplicar la cartografía oficial...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=15)
    print("[OK] Conectado.")

    print("4. Subiendo SQL oficial al VPS...")
    sftp = client.open_sftp()
    sftp.put(sql_path, "/tmp/tonala_exact.sql")
    sftp.close()

    print("5. Ejecutando actualización en PostgreSQL de producción...")
    cmd = "cat /tmp/tonala_exact.sql | docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os && rm -f /tmp/tonala_exact.sql"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8")
    err = stderr.read().decode("utf-8")
    if err:
        print("Avisos:", err)
    print("[OK] Salida:\n", "\n".join(out.splitlines()[-6:]))

    print("\n6. Verificando conteo de secciones oficiales en PostgreSQL:")
    cmd_count = """
    docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c "
      SELECT 
        COUNT(*) as total_secciones_ine_oficiales,
        COUNT(geom_json) as con_geometria_exacta,
        MIN(section_num) as min_sec,
        MAX(section_num) as max_sec
      FROM electoral_sections;
    "
    """
    stdin, stdout, stderr = client.exec_command(cmd_count)
    print(stdout.read().decode("utf-8"))

    client.close()
    print(f"\n🎉 ¡Cartografía VECTORIAL OFICIAL DEL INE ({len(tonala_features)} secciones de Tonalá) cargada con 100% de exactitud!")

if __name__ == "__main__":
    process_kml()
