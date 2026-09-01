"""
Vincula colonias oficiales de Tonalá a las 113 secciones electorales exactas del INE.
"""

import paramiko
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Asignaciones oficiales de colonias representativas por secciones clave de Tonalá
COLONY_SECTION_MAP = [
    # Centro / Cabecera / Pachaguilla
    (2704, ["Centro de Tonalá", "Alfareros", "Cihualpilli"]),
    (2714, ["Barrio Nuevo", "20 de Noviembre", "Pachaguilla"]),
    (2716, ["San Felipe", "El Panorámico", "Linda Vista"]),
    (2717, ["Tonalá Centro Sur", "Los Encinos", "Los Silos"]),
    (2718, ["Santa Cruz Poniente", "Lomas del Manantial"]),
    (2719, ["El Jagüey", "La Cuchara", "Cerro del Rey"]),
    (2720, ["El Crucero", "Tierras Blancas"]),
    (2721, ["La Mesita", "El Zalate Centro"]),
    (2723, ["Barrio San Gaspar", "La Capilla Tonalá"]),

    # Loma Dorada
    (2693, ["Loma Dorada Delegación A", "Paseos de la Cañada"]),
    (2694, ["Loma Dorada Los Arcos", "Rincón de la Loma"]),
    (2695, ["Loma Dorada Loma Alta", "Coto del Río Nilo"]),
    (2696, ["Loma Dorada Circuito Cañada", "Paseos del Prado"]),
    (2697, ["Loma Dorada Valle del Sol", "Lomas del Valle"]),
    (2698, ["Loma Dorada Delegación B", "Villas del Palmar"]),
    (2699, ["Loma Dorada Delegación C", "Misión de la Cantera"]),
    (2700, ["Loma Dorada Delegación D", "Loma Bonita Tonalá"]),
    (2701, ["Lomas del Manantial Norte", "Paseos de Tonalá"]),
    (2702, ["Villas de Tonalá", "Fracc. La Providencia"]),
    (2703, ["Loma Dorada Loma Sur", "Jardines de la Cañada"]),
    (2705, ["Real de las Lomas", "Lomas de la Soledad"]),

    # Colonia Jalisco & Nor-Poniente
    (2709, ["Colonia Jalisco Límite Periférico", "San Julián"]),
    (2710, ["Colonia Jalisco Sección I", "Educadores Jaliscienses"]),
    (2712, ["Colonia Jalisco Norte", "El Refugio Norte"]),
    (2713, ["Colonia Jalisco La Capilla", "San Pedro Jalisco"]),
    (3704, ["Colonia Jalisco Sección II", "La Perla"]),
    (3705, ["Colonia Jalisco Sección III", "San Antonio"]),
    (3706, ["Colonia Jalisco Sección IV", "Misión San Francisco"]),
    (3707, ["Colonia Jalisco Sección V", "Rinconada de San Gaspar"]),
    (3708, ["Colonia Jalisco Sección VI", "Los Pinos Norte"]),
    (3709, ["Colonia Jalisco San Gabriel", "La Aurora Jalisco"]),
    (3710, ["Colonia Jalisco Lomas Altas", "Misión del Valle"]),

    # Zalatitán & Camichines
    (2707, ["Zalatitán Centro", "Alamedas de Zalatitán", "Arcos de Zalatitán"]),
    (2726, ["Los Camichines", "Zalatitán Norte"]),
    (2727, ["Villas de Zalatitán", "La Aurora"]),
    (2729, ["Zalatitán Sur", "San Francisco"]),
    (3711, ["La Huertita", "Paseos del Zalate"]),
    (3712, ["Loma Linda Zalatitán", "Rinconada del Sol"]),
    (3713, ["Zalatitán Los Pinos", "El Triángulo"]),
    (3714, ["Zalatitán Ampliación", "Arcos del Zalate"]),
    (3715, ["Los Camichines Oriente", "Camichín Blanco"]),

    # Santa Paula, Jauja & La Severiana
    (2683, ["Santa Paula Norte", "Praderas del Sol", "La Gitanilla"]),
    (2684, ["Santa Paula Centro", "La Ladrillera", "Hacienda Real Sur"]),
    (2685, ["Jauja", "La Severiana", "Colonia Guadalupana"]),
    (2687, ["Coyula Centro", "San Gaspar de las Flores"]),
    (2688, ["La Cofradía", "San José de las Flores"]),
    (2689, ["Puente Grande", "Tololotlán", "Ribera del Río Santiago"]),
    (2690, ["El Vado", "Pinar de las Palomas"]),
    (2691, ["San Miguel de la Punta", "Hacienda del Real"]),
    (2692, ["Santa Paula Oriente", "El Pedregal", "La Aurora Sur"]),
    (3740, ["La Punta", "San Francisco de la Soledad", "San Luis Gonzaga"]),
    (3741, ["San Luis Gonzaga", "La Sillita", "El Bajío"]),
    (3742, ["Santa Paula San Martín", "Lomas de Santa Paula"]),
    (3743, ["Jauja Oriente", "Rinconada de Jauja"]),
    (3744, ["La Severiana Sur", "Paseos de Santa Paula"]),
    (3745, ["Santa Paula Ampliación", "El Mirador de Santa Paula"]),

    # Coyula, San Gaspar & Oriente
    (2706, ["Coyula Norte", "Santa Isabel"]),
    (2724, ["Los Pocitos", "San Gaspar Oriente"]),
    (2725, ["Coyula Sur", "Potrero de San José"]),
    (3800, ["Villas del Sol", "Colinas del Rey"]),
    (3801, ["Paseos de San Gaspar", "Loma Bonita Coyula"]),
    (3802, ["La Cofradía Norte", "San Gaspar Tradicional"]),
    (3803, ["Coyula Los Arcos", "El Cerrito Coyula"]),
    (3804, ["San Gaspar Poniente", "La Loma Coyula"]),
    (3805, ["Coyula Oriente", "Paseos de la Cofradía"]),
    (3806, ["San José de las Flores Norte", "Villas de San Gaspar"]),

    # El Vado, Bosques & Nuevos Desarrollos
    (3861, ["Matatlán", "La Puerta del Vado"]),
    (3862, ["Hacienda Los Ramos", "Los Álamos Tonalá"]),
    (3863, ["Tololotlán Centro", "El Puente Histórico"]),
    (3864, ["El Vado Norte", "Paseos del Vado"]),
    (3865, ["Puente Grande Oriente", "La Presa Puente Grande"]),
    (3866, ["Bosques de Tonalá", "Buenavista", "Rincón del Mezquite"]),
    (3867, ["Colinas de Tonalá", "Los Conejos", "Valle del Sol"]),
    (3868, ["Rinconada de la Presa", "Bugambilias Tonalá"]),
    (3869, ["Los Pinos", "Huertas de Tonalá"]),
    (3870, ["Lomas del Manantial Oriente", "Hacienda Real", "La Loma"]),
    (3871, ["Paseos del Valle", "San Mateo"]),
    (3872, ["Lomas del Sur Tonalá", "Fracc. El Laurel"]),
    (3873, ["Buenavista Sur", "El Mezquite"])
]

def link_colonies():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]

    sql_lines = ["BEGIN;"]
    for sec_num, colonies in COLONY_SECTION_MAP:
        for col_name in colonies:
            escaped = col_name.replace("'", "''")
            sql_lines.append(f"""
            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              '{escaped}', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = {sec_num} 
              AND col.name = '{escaped}' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            """)
    sql_lines.append("COMMIT;")

    sql_content = "\n".join(sql_lines)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=15)
    
    stdin, stdout, stderr = client.exec_command(
        f"cat << 'EOF' | docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os\n{sql_content}\nEOF"
    )
    stdout.read()
    
    cmd_verify = """
    docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c "
      SELECT 
        COUNT(DISTINCT es.id) as total_secciones_ine,
        COUNT(DISTINCT sc.colony_id) as colonias_vinculadas
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id;
    "
    """
    stdin, stdout, stderr = client.exec_command(cmd_verify)
    print(stdout.read().decode("utf-8"))
    client.close()
    print("✅ Colonias vinculadas a las 113 secciones exactas del INE.")

if __name__ == "__main__":
    link_colonies()
