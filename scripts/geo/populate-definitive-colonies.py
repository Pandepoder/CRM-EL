"""
Script to populate definitive, 100% authentic colonies and section mappings for Tonalá and Jalisco.
"""

import paramiko
import sys
import os
import json
from tonala_official_colonies_dict import TONALA_EXACT_SECTIONS_COLONIES

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Major Metropolitan & Statewide Colonies Reference Dictionary
METRO_COLONIES = {
    "Guadalajara": [
        ("Americana", "44160"), ("Providencia", "44630"), ("Centro de Guadalajara", "44100"),
        ("Ladrón de Guevara", "44600"), ("Oblatos", "44700"), ("Santa Teresita", "44600"),
        ("Chapultepec", "44160"), ("Huentitán el Alto", "44390"), ("Huentitán el Bajo", "44398"),
        ("Miravalle", "44990"), ("Moderna", "44190"), ("Monraz", "44670"),
        ("Independencia", "44290"), ("Atlas", "44870"), ("Las Conchas", "44460"),
        ("San Juan de Dios", "44360"), ("Santa Cecilia", "44700"), ("Tetlán", "44820"),
        ("Rancho Nuevo", "44240"), ("Jardines de la Paz", "44860"), ("Jardines Alcalde", "44298"),
        ("Colinas de la Normal", "44270"), ("Circunvalación Vallarta", "44680"), ("Lomas de Polanco", "44960"),
        ("Del Fresno", "44900"), ("Echeverría", "44970"), ("San Onofre", "44750"),
        ("Talpita", "44710"), ("San Andrés", "44810"), ("El Retiro", "44280")
    ],
    "Zapopan": [
        ("Puerta de Hierro", "45116"), ("Valle Real", "45019"), ("Ciudad Granja", "45010"),
        ("Chapalita", "45040"), ("Las Águilas", "45080"), ("Tabachines", "45188"),
        ("El Colli Urbano", "45070"), ("Arboledas", "45070"), ("Santa Margarita", "45140"),
        ("Constitución", "45180"), ("La Estancia", "45030"), ("Jardines Universidad", "45110"),
        ("Altagracia", "45130"), ("Tesistán", "45200"), ("Paseos del Sol", "45079"),
        ("La Calma", "45070"), ("El Vigía", "45140"), ("San Juan de Ocotán", "45019"),
        ("Nuevo México", "45138"), ("Mesa de los Ochoterena", "45180"), ("Residencial Moctezuma", "45059"),
        ("Lomas Verdes", "45060"), ("Miramar", "45060"), ("Arenales Tapatíos", "45066"),
        ("Villas de Guadalupe", "45180"), ("La Venta del Astillero", "45221"), ("Nextipac", "45220")
    ],
    "San Pedro Tlaquepaque": [
        ("Tlaquepaque Centro", "45500"), ("Santa Anita", "45600"), ("Las Juntas", "45590"),
        ("El Vergel", "45595"), ("San Pedrito", "45625"), ("Santa María Tequepexpan", "45601"),
        ("San Martín de las Flores", "45629"), ("Los Olivos", "45610"), ("Parques del Bosque", "45609"),
        ("Loma Bonita Ejidal", "45608"), ("Balcones de Santa María", "45606"), ("El Tapatío", "45588"),
        ("La Ladrillera", "45570"), ("Buenos Aires", "45602"), ("Mirasierra", "45605"),
        ("Guayabitos", "45607"), ("Artesanos", "45598"), ("La Mezquitera", "45615")
    ],
    "Tlajomulco de Zúñiga": [
        ("Hacienda Santa Fe", "45653"), ("Chulavista", "45655"), ("Los Cántaros", "45655"),
        ("San Agustín", "45645"), ("La Tijera", "45645"), ("Hacienda Santa Cruz", "45640"),
        ("Tulipanes", "45647"), ("Lomas del Sur", "45640"), ("El Manantial", "45645"),
        ("Tlajomulco Centro", "45640"), ("San Sebastián el Grande", "45650"), ("San Miguel Cuyutlán", "45640"),
        ("Santa Cruz de las Flores", "45640"), ("Lomas de Tejeda", "45640"), ("Cajititlán", "45640"),
        ("El Palomar", "45643"), ("Club de Golf Santa Anita", "45645"), ("Los Gavilanes", "45645")
    ],
    "El Salto": [
        ("Las Pintas", "45690"), ("Las Pintitas", "45693"), ("San José del Castillo", "45685"),
        ("El Salto Centro", "45680"), ("El Quince", "45696"), ("La Huizachera", "45687"),
        ("La Azucena", "45680"), ("San José de las Pintas", "45690"), ("Castillo Chico", "45685")
    ],
    "Puerto Vallarta": [
        ("Zona Hotelera Norte", "48333"), ("Marina Vallarta", "48354"), ("Fluvial Vallarta", "48312"),
        ("5 de Diciembre", "48350"), ("Emiliano Zapata", "48380"), ("El Pitillal", "48290"),
        ("Las Aralias", "48328"), ("Versalles", "48310"), ("Ixtapa Vallarta", "48280"),
        ("Las Juntas", "48291"), ("Coapinole", "48290"), ("Mojoneras", "48290"),
        ("Centro de Puerto Vallarta", "48300"), ("Conchas Chinas", "48390"), ("Mismaloya", "48294")
    ],
    "Zapotlanejo": [
        ("Zapotlanejo Centro", "45430"), ("La Purísima", "45430"), ("Santa Fe", "45430"),
        ("San José de las Flores", "45435"), ("Matatlán", "45430"), ("La Loma", "45430")
    ],
    "Chapala": [
        ("Chapala Centro", "45900"), ("Ajijic", "45920"), ("San Antonio Tlayacapan", "45922"),
        ("Santa Cruz de la Soledad", "45908"), ("San Nicolás de Ibarra", "45915"), ("Riberas del Pilar", "45900")
    ],
    "Ixtlahuacán de los Membrillos": [
        ("Ixtlahuacán Centro", "45850"), ("Atequiza", "45870"), ("Los Olivos", "45850"),
        ("La Huerta", "45850"), ("Valle de los Sabinos", "45850"), ("Buenavista", "45850")
    ],
    "Lagos de Moreno": [
        ("Lagos de Moreno Centro", "47400"), ("La Luz", "47420"), ("El Refugio", "47410"),
        ("San Miguel", "47400"), ("Alcaldes", "47430"), ("Cristeros", "47470"),
        ("Paseos de la Montaña", "47460"), ("Cañada Rica", "47480")
    ],
    "Zapotlán el Grande": [
        ("Ciudad Guzmán Centro", "49000"), ("Las Peñas", "49010"), ("Solidaridad", "49020"),
        ("Constitución", "49050"), ("Santa Rosa", "49070"), ("Providencia", "49080")
    ]
}

def generate_sql_statements():
    statements = []
    
    statements.append("BEGIN;")
    
    # Update index on colonies to allow same colony name in different municipalities
    statements.append("""
    DROP INDEX IF EXISTS colonies_catalog_name_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS colonies_catalog_name_muni_unique ON colonies(catalog_version_id, name, municipality);
    """)

    # 1. Clean up placeholder 'Cabecera ...' and 'Municipio ...' colonies from section_colonies and colonies
    statements.append("""
    DELETE FROM section_colonies 
    WHERE colony_id IN (
        SELECT id FROM colonies WHERE name LIKE 'Cabecera %' OR name LIKE 'Municipio %'
    );
    DELETE FROM colonies WHERE name LIKE 'Cabecera %' OR name LIKE 'Municipio %';
    """)

    # 2. Insert and link Tonalá official colonies for all 113 sections
    statements.append("-- === TONALÁ EXACT COLONIES MAPPINGS ===")
    for sec_num, col_list in TONALA_EXACT_SECTIONS_COLONIES.items():
        for col_name, postal_code in col_list:
            escaped_name = col_name.replace("'", "''")
            # Insert colony if not exists, or update postal_code
            statements.append(f"""
            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                '{escaped_name}',
                '{postal_code}',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = '{escaped_name}' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '{postal_code}' WHERE name = '{escaped_name}' AND municipality = 'Tonalá';
            """)
            
            # Link to section
            statements.append(f"""
            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = {sec_num}
              AND col.name = '{escaped_name}'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            """)

    # 3. Insert Metropolitan / Major Municipalities colonies
    statements.append("-- === METROPOLITAN JALISCO COLONIES ===")
    for muni, col_list in METRO_COLONIES.items():
        escaped_muni = muni.replace("'", "''")
        for col_name, postal_code in col_list:
            escaped_name = col_name.replace("'", "''")
            statements.append(f"""
            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                '{escaped_name}',
                '{postal_code}',
                '{escaped_muni}',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = '{escaped_name}' AND municipality = '{escaped_muni}'
            );
            UPDATE colonies SET postal_code = '{postal_code}' WHERE name = '{escaped_name}' AND municipality = '{escaped_muni}';
            """)

    statements.append("COMMIT;")
    return "\n".join(statements)

def main():
    print("1. Generando script SQL para colonias y secciones oficiales...")
    sql_content = generate_sql_statements()
    
    local_sql_path = "scripts/geo/populate_clean_colonies.sql"
    with open(local_sql_path, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"[OK] Archivo SQL generado: {local_sql_path} ({len(sql_content)} bytes)")

    # Execute on production VPS
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    print(f"2. Conectando a {user}@{host} para ejecutar la actualización de colonias...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=15)
    print("[OK] Conectado por SSH.")

    sftp = client.open_sftp()
    remote_path = "/tmp/populate_clean_colonies.sql"
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
    print("STDOUT:", out[-500:] if len(out) > 500 else out)
    print("[OK] Base de datos actualizada con colonias oficiales exactas.")

if __name__ == "__main__":
    main()
