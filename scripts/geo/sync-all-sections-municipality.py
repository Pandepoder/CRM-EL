"""
Syncs official INE municipality and district metadata for all 3,787 electoral sections in Jalisco.
"""

import xml.etree.ElementTree as ET
import paramiko
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

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

def main():
    kml_path = "scripts/geo/raw/kml/SeccionesJalSept2022.kml"
    print(f"1. Leyendo KML: {kml_path}...")
    tree = ET.parse(kml_path)
    root = tree.getroot()
    ns = {'kml': 'http://www.opengis.net/kml/2.2'}

    updates = []
    for pm in root.findall('.//kml:Placemark', ns):
        ext = pm.find('kml:ExtendedData', ns)
        if ext is None:
            continue
        muni_code = None
        sec_num = None
        dist_fed = None
        dist_loc = None
        for sd in ext.findall('.//kml:SimpleData', ns):
            name = sd.attrib.get('name')
            if name == 'MUNICIPIO':
                muni_code = int(float(sd.text))
            elif name == 'SECCION':
                sec_num = int(float(sd.text))
            elif name == 'DISTRITO':
                dist_fed = int(float(sd.text))
            elif name == 'DISTRITO_L':
                dist_loc = int(float(sd.text))
        
        if sec_num is not None and muni_code in MUNICIPIOS_JALISCO_125:
            muni_name = MUNICIPIOS_JALISCO_125[muni_code].replace("'", "''")
            updates.append((sec_num, muni_name, dist_fed, dist_loc))

    print(f"[OK] Total secciones extraídas con metadatos: {len(updates)}")

    # Build SQL script
    sql_lines = [
        "BEGIN;",
        "ALTER TABLE electoral_sections ADD COLUMN IF NOT EXISTS municipality TEXT;",
        "ALTER TABLE electoral_sections ADD COLUMN IF NOT EXISTS district_federal INTEGER;",
        "ALTER TABLE electoral_sections ADD COLUMN IF NOT EXISTS district_local INTEGER;"
    ]
    
    for sec_num, muni_name, dist_fed, dist_loc in updates:
        sql_lines.append(f"""
        UPDATE electoral_sections 
        SET 
            municipality = '{muni_name}',
            district_federal = {dist_fed if dist_fed is not None else 'NULL'},
            district_local = {dist_loc if dist_loc is not None else 'NULL'}
        WHERE section_num = {sec_num};
        """)

    sql_lines.append("COMMIT;")

    sql_script = "\n".join(sql_lines)
    local_sql_path = "scripts/geo/sync_sections_metadata.sql"
    with open(local_sql_path, "w", encoding="utf-8") as f:
        f.write(sql_script)
    print(f"[OK] Archivo SQL generado: {local_sql_path} ({len(sql_script)} bytes)")

    # Execute on VPS
    host = "45.80.153.22"
    user = "root"
    password = "***REMOVED-VPS-SSH-PASSWORD***"
    
    print(f"2. Conectando a {user}@{host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=15)
    print("[OK] Conectado por SSH.")

    sftp = client.open_sftp()
    remote_path = "/tmp/sync_sections_metadata.sql"
    sftp.put(local_sql_path, remote_path)
    sftp.close()
    print("[OK] Archivo SQL transferido al VPS.")

    cmd = f'docker exec -i tonala-os-postgres psql -U tonala -d tonala_os < {remote_path}'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    
    print("=== Salida de ejecución PostgreSQL ===")
    if err:
        print("STDERR:", err[:500])
    print("STDOUT:", out[-300:] if len(out) > 300 else out)

if __name__ == "__main__":
    main()
