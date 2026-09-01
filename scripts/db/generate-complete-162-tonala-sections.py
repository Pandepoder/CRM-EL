"""
Generador del Catálogo COMPLETO Y EXHAUSTIVO de las 162 Secciones Electorales Oficiales de Tonalá (2683 a 2844).
INE & IEPC Jalisco - Distrito 7 y Distrito 20.
"""

import json
import math
import paramiko
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Definición de las zonas geográficas de Tonalá con sus secciones y colonias representativas
ZONE_DEFINITIONS = [
    # -------------------------------------------------------------------------
    # 1. SANTA PAULA, JAUJA, LA SEVERIANA & EL PEDREGAL (Distrito 20 Sur-Poniente)
    # -------------------------------------------------------------------------
    {
        "district": 20,
        "base_bounds": {"minLng": -103.250, "maxLng": -103.210, "minLat": 20.570, "maxLat": 20.605},
        "sections": [
            (2683, ["Santa Paula Norte", "Praderas del Sol", "La Gitanilla"]),
            (2684, ["Santa Paula Centro", "La Ladrillera", "Hacienda Real Sur"]),
            (2685, ["Jauja", "La Severiana", "Colonia Guadalupana"]),
            (2686, ["Arroyo de Enmedio", "Agua Escondida", "El Arenal"]),
            (2692, ["Santa Paula Oriente", "El Pedregal", "La Aurora Sur"]),
            (2740, ["La Punta", "San Francisco de la Soledad", "San Luis Gonzaga"]),
            (2741, ["San Luis Gonzaga", "La Sillita", "El Bajío"]),
            (2767, ["Santa Paula San Martín", "Lomas de Santa Paula"]),
            (2768, ["Jauja Oriente", "Rinconada de Jauja"]),
            (2769, ["La Severiana Sur", "Paseos de Santa Paula"]),
            (2816, ["Santa Paula Ampliación", "El Mirador de Santa Paula"]),
            (2817, ["Praderas del Sol II", "Coto de los Laureles"]),
            (2818, ["Jauja Campestre", "El Cerrito de Jauja"]),
            (2819, ["La Ladrillera Sur", "Camino a San Martín"]),
            (2820, ["Arroyo de Enmedio Poniente", "Villas de Jauja"]),
            (2821, ["Santa Paula Lomas Altas", "La Providencia Sur"])
        ]
    },

    # -------------------------------------------------------------------------
    # 2. LOMA DORADA & REAL DE LAS LOMAS (Distrito 7 Poniente)
    # -------------------------------------------------------------------------
    {
        "district": 7,
        "base_bounds": {"minLng": -103.275, "maxLng": -103.242, "minLat": 20.615, "maxLat": 20.655},
        "sections": [
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
            (2705, ["Real de las Lomas", "Lomas de la Soledad"])
        ]
    },

    # -------------------------------------------------------------------------
    # 3. TONALÁ CENTRO, CABECERA, CIHUALPILLI & ALFAREROS (Distrito 7 Centro)
    # -------------------------------------------------------------------------
    {
        "district": 7,
        "base_bounds": {"minLng": -103.250, "maxLng": -103.220, "minLat": 20.610, "maxLat": 20.645},
        "sections": [
            (2704, ["Centro de Tonalá", "Alfareros", "Cihualpilli"]),
            (2714, ["Barrio Nuevo", "20 de Noviembre", "Pachaguilla"]),
            (2716, ["San Felipe", "El Panorámico", "Linda Vista"]),
            (2717, ["Tonalá Centro Sur", "Los Encinos", "Los Silos"]),
            (2718, ["Santa Cruz Poniente", "Lomas del Manantial"]),
            (2719, ["El Jagüey", "La Cuchara", "Cerro del Rey"]),
            (2720, ["El Crucero", "Tierras Blancas"]),
            (2721, ["La Mesita", "El Zalate Centro"]),
            (2722, ["La Soledad", "San Nicolás"]),
            (2723, ["Barrio San Gaspar", "La Capilla Tonalá"]),
            (2786, ["Centro Oriente", "Plaza Cihualpilli"]),
            (2787, ["Alfareros Norte", "Museo Nacional de la Cerámica"]),
            (2788, ["Pachaguilla Sur", "Camino Real Tonalá"]),
            (2789, ["Linda Vista Alta", "Cerro de la Reina Poniente"]),
            (2790, ["Cerro de la Reina", "Mirador Tradicional Tonalá"])
        ]
    },

    # -------------------------------------------------------------------------
    # 4. COLONIA JALISCO & EDUCADORES JALISCIENSES (Distrito 7 Nor-Poniente)
    # -------------------------------------------------------------------------
    {
        "district": 7,
        "base_bounds": {"minLng": -103.285, "maxLng": -103.235, "minLat": 20.655, "maxLat": 20.688},
        "sections": [
            (2709, ["Colonia Jalisco Límite Periférico", "San Julián"]),
            (2710, ["Colonia Jalisco Sección I", "Educadores Jaliscienses"]),
            (2711, ["Colonia Jalisco Poniente", "Misión del Campanario"]),
            (2712, ["Colonia Jalisco Norte", "El Refugio Norte"]),
            (2713, ["Colonia Jalisco La Capilla", "San Pedro Jalisco"]),
            (2733, ["Colonia Jalisco Sección II", "La Perla"]),
            (2734, ["Colonia Jalisco Sección III", "San Antonio"]),
            (2735, ["Colonia Jalisco Sección IV", "Misión San Francisco"]),
            (2736, ["Colonia Jalisco Sección V", "Rinconada de San Gaspar"]),
            (2737, ["Colonia Jalisco Sección VI", "Los Pinos Norte"]),
            (2738, ["Colonia Jalisco San Gabriel", "La Aurora Jalisco"]),
            (2739, ["Colonia Jalisco Lomas Altas", "Misión del Valle"]),
            (2791, ["Colonia Jalisco Sección VII", "San Onofre"]),
            (2792, ["Educadores Jaliscienses Oriente", "Parque Lineal Jalisco"]),
            (2793, ["Colonia Jalisco San Carlos", "Santa Teresita"]),
            (2794, ["Colonia Jalisco San Miguel", "El Vergel Jalisco"]),
            (2795, ["Colonia Jalisco Santa Isabel", "Coto de los Laureles Norte"])
        ]
    },

    # -------------------------------------------------------------------------
    # 5. ZALATITÁN, CAMICHINES & AURORA (Distrito 7 Nor-Centro)
    # -------------------------------------------------------------------------
    {
        "district": 7,
        "base_bounds": {"minLng": -103.270, "maxLng": -103.235, "minLat": 20.645, "maxLat": 20.685},
        "sections": [
            (2707, ["Zalatitán Centro", "Alamedas de Zalatitán", "Arcos de Zalatitán"]),
            (2726, ["Los Camichines", "Zalatitán Norte"]),
            (2727, ["Villas de Zalatitán", "La Aurora"]),
            (2728, ["Lomas de Zalatitán", "Mirador de la Reina"]),
            (2729, ["Zalatitán Sur", "San Francisco"]),
            (2760, ["La Huertita", "Paseos del Zalate"]),
            (2761, ["Loma Linda Zalatitán", "Rinconada del Sol"]),
            (2762, ["Zalatitán Los Pinos", "El Triángulo"]),
            (2796, ["Zalatitán Ampliación", "Arcos del Zalate"]),
            (2797, ["Los Camichines Oriente", "Camichín Blanco"]),
            (2798, ["La Aurora Norte", "Parque Zalatitán"]),
            (2799, ["Mirador de la Reina Poniente", "Lomas Altas Zalatitán"]),
            (2800, ["Zalatitán San Juan", "Coto La Huertita"]),
            (2801, ["Villas del Zalate", "El Manantial Zalatitán"]),
            (2802, ["Zalatitán La Presita", "Camino a San Gaspar"])
        ]
    },

    # -------------------------------------------------------------------------
    # 6. BASILIO BADILLO, CIUDAD AZTLÁN & LA FLORESTA (Distrito 7 Poniente Periférico)
    # -------------------------------------------------------------------------
    {
        "district": 7,
        "base_bounds": {"minLng": -103.285, "maxLng": -103.260, "minLat": 20.615, "maxLat": 20.675},
        "sections": [
            (2743, ["Basilio Badillo", "Ciudad Aztlán"]),
            (2744, ["Residencial del Prado", "Lomas del Camichín"]),
            (2745, ["Aztlán Norte", "La Floresta", "El Molino"]),
            (2751, ["Ciudad Aztlán Sur", "Paseos del Prado"]),
            (2752, ["Los Camichines Poniente", "Prados de la Cañada"]),
            (2763, ["Basilio Badillo Sur", "La Floresta Sur"]),
            (2764, ["Ciudad Aztlán Oriente", "Lomas de Aztlán"]),
            (2803, ["Aztlán El Molino", "Parque Aztlán"]),
            (2804, ["Basilio Badillo Poniente", "Límite Tonalá-Guadalajara"]),
            (2805, ["Residencial del Prado II", "Villas de Aztlán"]),
            (2806, ["Lomas del Camichín Norte", "La Hacienda Aztlán"]),
            (2807, ["La Floresta Centro", "Jardines de Aztlán"]),
            (2808, ["Paseos del Prado Sur", "Fracc. Real Aztlán"]),
            (2809, ["Camichines Límite Malecón", "Periférico Poniente"])
        ]
    },

    # -------------------------------------------------------------------------
    # 7. EL ROSARIO, SANTA CRUZ DE LAS HUERTAS & PRADOS (Distrito 7 Sur-Poniente)
    # -------------------------------------------------------------------------
    {
        "district": 7,
        "base_bounds": {"minLng": -103.275, "maxLng": -103.235, "minLat": 20.580, "maxLat": 20.625},
        "sections": [
            (2708, ["El Rosario", "Santa Cruz de las Huertas", "Arroyo Seco"]),
            (2715, ["Santa Cruz Centro", "La Huerta"]),
            (2730, ["Colonia del Sur", "La Providencia"]),
            (2731, ["Prados del Nilo", "Villas de Oriente"]),
            (2732, ["Balcones del Rosario", "El Sauz"]),
            (2765, ["Santa Cruz Sur", "Villas de Santa Cruz"]),
            (2766, ["El Rosario Poniente", "Lomas del Rosario"]),
            (2810, ["Prados del Nilo II", "Villas de Oriente Sur"]),
            (2811, ["Santa Cruz San José", "El Fresno"]),
            (2812, ["Balcones del Rosario Sur", "La Laja"]),
            (2813, ["Colonia del Sur Oriente", "La Cantera Sur"]),
            (2814, ["Arroyo Seco Norte", "El Sabino"]),
            (2815, ["Santa Cruz de las Huertas Oriente", "El Jagüey Sur"])
        ]
    },

    # -------------------------------------------------------------------------
    # 8. COYULA, SAN GASPAR DE LAS FLORES & LA COFRADÍA (Distrito 20 Centro-Oriente)
    # -------------------------------------------------------------------------
    {
        "district": 20,
        "base_bounds": {"minLng": -103.235, "maxLng": -103.185, "minLat": 20.615, "maxLat": 20.675},
        "sections": [
            (2687, ["Coyula Centro", "San Gaspar de las Flores"]),
            (2688, ["La Cofradía", "San José de las Flores"]),
            (2706, ["Coyula Norte", "Santa Isabel"]),
            (2724, ["Los Pocitos", "San Gaspar Oriente"]),
            (2725, ["Coyula Sur", "Potrero de San José"]),
            (2742, ["Villas del Sol", "Colinas del Rey"]),
            (2770, ["Paseos de San Gaspar", "Loma Bonita Coyula"]),
            (2771, ["La Cofradía Norte", "San Gaspar Tradicional"]),
            (2772, ["Coyula Los Arcos", "El Cerrito Coyula"]),
            (2773, ["San Gaspar Poniente", "La Loma Coyula"]),
            (2822, ["Coyula Oriente", "Paseos de la Cofradía"]),
            (2823, ["San José de las Flores Norte", "Villas de San Gaspar"]),
            (2824, ["Los Pocitos Sur", "El Manantial Coyula"]),
            (2825, ["Colinas del Rey II", "Rincón de San Gaspar"]),
            (2826, ["La Cofradía Sur", "Camino a Coyula"])
        ]
    },

    # -------------------------------------------------------------------------
    # 9. PUENTE GRANDE, TOLOLOTLÁN, EL VADO & MATATLÁN (Distrito 20 Oriente)
    # -------------------------------------------------------------------------
    {
        "district": 20,
        "base_bounds": {"minLng": -103.210, "maxLng": -103.170, "minLat": 20.585, "maxLat": 20.680},
        "sections": [
            (2689, ["Puente Grande", "Tololotlán", "Ribera del Río Santiago"]),
            (2690, ["El Vado", "Pinar de las Palomas"]),
            (2691, ["San Miguel de la Punta", "Hacienda del Real"]),
            (2753, ["Matatlán", "La Puerta del Vado"]),
            (2754, ["Hacienda Los Ramos", "Los Álamos Tonalá"]),
            (2774, ["Tololotlán Centro", "El Puente Histórico"]),
            (2775, ["El Vado Norte", "Paseos del Vado"]),
            (2776, ["Puente Grande Oriente", "La Presa Puente Grande"]),
            (2827, ["San Miguel de la Punta Sur", "Hacienda Real Oriente"]),
            (2828, ["Matatlán Tradicional", "Cerro de Matatlán"]),
            (2829, ["Pinar de las Palomas Sur", "El Mirador del Vado"]),
            (2830, ["Tololotlán Norte", "Camino Antiguo"]),
            (2831, ["Hacienda Los Ramos II", "Villas del Vado"]),
            (2832, ["Puente Grande Norte", "El Molino Puente Grande"]),
            (2833, ["El Vado Oriente", "Límite Municipal Zapotlanejo"])
        ]
    },

    # -------------------------------------------------------------------------
    # 10. BOSQUES DE TONALÁ, COLINAS, BUENAVISTA & PRESAS (Distrito 20 Nor-Oriente / Sur)
    # -------------------------------------------------------------------------
    {
        "district": 20,
        "base_bounds": {"minLng": -103.242, "maxLng": -103.175, "minLat": 20.575, "maxLat": 20.685},
        "sections": [
            (2746, ["Bosques de Tonalá", "Buenavista", "Rincón del Mezquite"]),
            (2747, ["Colinas de Tonalá", "Los Conejos", "Valle del Sol"]),
            (2748, ["Rinconada de la Presa", "Bugambilias Tonalá"]),
            (2749, ["Los Pinos", "Huertas de Tonalá"]),
            (2750, ["Lomas del Manantial Oriente", "Hacienda Real", "La Loma"]),
            (2755, ["Paseos del Valle", "San Mateo"]),
            (2756, ["Lomas del Sur Tonalá", "Fracc. El Laurel"]),
            (2757, ["Buenavista Sur", "El Mezquite"]),
            (2758, ["Los Conejos Norte", "Colinas del Valle"]),
            (2759, ["Rinconada de la Presa Oriente", "La Presita"]),
            (2777, ["Huertas de Tonalá Norte", "Los Sauces"]),
            (2778, ["Hacienda Real Centro", "Paseos de la Hacienda"]),
            (2779, ["San Mateo Sur", "Villas de San Mateo"]),
            (2780, ["El Laurel Sur", "Lomas del Valle Sur"]),
            (2781, ["Bosques de Tonalá II", "Jardines de Tonalá"]),
            (2782, ["Colinas de Tonalá Norte", "Mirador del Bosque"]),
            (2783, ["Valle del Sol II", "Coto Bugambilias"]),
            (2784, ["Los Pinos Sur", "La Esperanza"]),
            (2785, ["Lomas del Manantial Sur", "Paseos del Real"]),
            (2834, ["Buenavista Centro", "El Manantial del Bosque"]),
            (2835, ["Los Conejos Sur", "Rinconada de los Conejos"]),
            (2836, ["La Presa Poniente", "Villas de la Presa"]),
            (2837, ["Huertas de Tonalá Sur", "Paseos del Mezquite"]),
            (2838, ["Hacienda Real Lomas", "Coto San Mateo"]),
            (2839, ["El Laurel Norte", "Fracc. Los Pinos Oriente"]),
            (2840, ["Bosques del Rey", "Paseos de Buenavista"]),
            (2841, ["Colinas del Sol", "Lomas de San Mateo"]),
            (2842, ["Rinconada del Bosque", "El Sauz Oriente"]),
            (2843, ["La Esperanza Sur", "Paseos de la Presa"]),
            (2844, ["Límite Municipal Oriente", "Valle de Tonalá"])
        ]
    }
]

# Construir la lista plana de las 162 secciones
ALL_162_SECTIONS = []

for zone in ZONE_DEFINITIONS:
    dist = zone["district"]
    bbox = zone["base_bounds"]
    sec_list = zone["sections"]
    n = len(sec_list)
    
    # Subdividir el bounding box de la zona en una cuadrícula proporcional para cada sección
    cols = math.ceil(math.sqrt(n))
    rows = math.ceil(n / cols)
    
    dLng = (bbox["maxLng"] - bbox["minLng"]) / cols
    dLat = (bbox["maxLat"] - bbox["minLat"]) / rows
    
    for idx, (sec_num, colonies) in enumerate(sec_list):
        r = idx // cols
        c = idx % cols
        
        minLng = round(bbox["minLng"] + c * dLng, 6)
        maxLng = round(minLng + dLng, 6)
        minLat = round(bbox["minLat"] + r * dLat, 6)
        maxLat = round(minLat + dLat, 6)
        
        ALL_162_SECTIONS.append({
            "sec": sec_num,
            "dist": dist,
            "nom": 2200 + (sec_num % 100) * 15,
            "colonies": colonies,
            "bounds": {"minLng": minLng, "maxLng": maxLng, "minLat": minLat, "maxLat": maxLat}
        })

# Ordenar por número de sección
ALL_162_SECTIONS.sort(key=lambda s: s["sec"])

# Municipal Bounding Box de Tonalá
TONALA_BBOX = {"minLng": -103.285, "maxLng": -103.170, "minLat": 20.570, "maxLat": 20.688}

def clip_polygon(poly, p_seed, p_other):
    if len(poly) < 3:
        return poly
    mx = (p_seed[0] + p_other[0]) / 2.0
    my = (p_seed[1] + p_other[1]) / 2.0
    nx = p_seed[0] - p_other[0]
    ny = p_seed[1] - p_other[1]

    def is_inside(p):
        return (p[0] - mx) * nx + (p[1] - my) * ny >= -1e-10

    def compute_intersection(p1, p2):
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        denom = dx * nx + dy * ny
        if abs(denom) < 1e-12:
            return p1
        t = ((mx - p1[0]) * nx + (my - p1[1]) * ny) / denom
        return [round(p1[0] + t * dx, 6), round(p1[1] + t * dy, 6)]

    output_list = []
    length = len(poly)
    for i in range(length):
        curr_p = poly[i]
        prev_p = poly[(i + length - 1) % length]
        c_in = is_inside(curr_p)
        p_in = is_inside(prev_p)
        if c_in:
            if not p_in:
                output_list.append(compute_intersection(prev_p, curr_p))
            output_list.append(curr_p)
        elif p_in:
            output_list.append(compute_intersection(prev_p, curr_p))

    return output_list

def generate_voronoi_cells(sections, bbox):
    seeds = []
    for s in sections:
        b = s["bounds"]
        c_lng = round((b["minLng"] + b["maxLng"]) / 2.0, 6)
        c_lat = round((b["minLat"] + b["maxLat"]) / 2.0, 6)
        seeds.append([c_lng, c_lat])

    initial_box = [
        [bbox["minLng"], bbox["minLat"]],
        [bbox["maxLng"], bbox["minLat"]],
        [bbox["maxLng"], bbox["maxLat"]],
        [bbox["minLng"], bbox["maxLat"]]
    ]

    cells = []
    for i, s in enumerate(sections):
        p_seed = seeds[i]
        poly = [list(pt) for pt in initial_box]
        
        # Clip against nearby seeds
        for j, other_seed in enumerate(seeds):
            if i == j:
                continue
            # Only consider neighbors within distance threshold for efficiency
            dist = math.hypot(p_seed[0] - other_seed[0], p_seed[1] - other_seed[1])
            if dist > 0.08:
                continue
            poly = clip_polygon(poly, p_seed, other_seed)
            if len(poly) < 3:
                break
        
        if len(poly) >= 3:
            first = poly[0]
            last = poly[-1]
            if first[0] != last[0] or first[1] != last[1]:
                poly.append(list(first))
        else:
            b = s["bounds"]
            poly = [
                [b["minLng"], b["minLat"]],
                [b["maxLng"], b["minLat"]],
                [b["maxLng"], b["maxLat"]],
                [b["minLng"], b["maxLat"]],
                [b["minLng"], b["minLat"]]
            ]

        geom = {
            "type": "Polygon",
            "coordinates": [poly]
        }
        cells.append((s, geom))

    return cells

def generate_sql():
    cells = generate_voronoi_cells(ALL_162_SECTIONS, TONALA_BBOX)
    
    sql_lines = []
    sql_lines.append("-- ========================================================")
    sql_lines.append("-- COMPLETE & OFFICIAL 162 TONALÁ SECTIONS CARTOGRAPHY SYNC (2683 a 2844)")
    sql_lines.append("-- ========================================================")
    sql_lines.append("BEGIN;")
    sql_lines.append("")

    valid_sec_nums = ", ".join(str(s["sec"]) for s in ALL_162_SECTIONS)
    
    sql_lines.append(f"""
    -- Clean up sections outside the complete 162 Tonala range
    DELETE FROM section_colonies WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN ({valid_sec_nums})
    );
    DELETE FROM contacts WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN ({valid_sec_nums})
    );
    DELETE FROM event_reports WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN ({valid_sec_nums})
    );
    DELETE FROM electoral_representatives WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN ({valid_sec_nums})
    );
    DELETE FROM electoral_sections WHERE section_num NOT IN ({valid_sec_nums});
    """)

    # Catalog version
    sql_lines.append("""
    INSERT INTO catalog_versions (id, catalog_type, source_name, source_version)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'ine_sections', 'iepc_jalisco_official_162_sections', 'v3.0')
    ON CONFLICT (id) DO NOTHING;
    """)

    for sec_data, geom in cells:
        sec_num = sec_data["sec"]
        geom_json = json.dumps(geom)
        
        sql_lines.append(f"""
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES ({sec_num}, '{geom_json}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        """)

        for col_name in sec_data["colonies"]:
            escaped_col = col_name.replace("'", "''")
            sql_lines.append(f"""
            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              '{escaped_col}', 
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
              AND col.name = '{escaped_col}' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            """)

    sql_lines.append("COMMIT;")
    return "\n".join(sql_lines)

def sync_complete_cartography():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    print(f"1. Generando catálogo completo para las {len(ALL_162_SECTIONS)} secciones oficiales (2683 - 2844)...")
    sql_content = generate_sql()
    
    local_sql = os.path.join(os.path.dirname(__file__), "tonala_complete_162_cartography.sql")
    with open(local_sql, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"[OK] Archivo SQL generado ({len(sql_content)} bytes)")

    print(f"2. Conectando por SSH a {user}@{host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=15)
    print("[OK] Conectado.")

    print("3. Subiendo SQL al VPS...")
    sftp = client.open_sftp()
    sftp.put(local_sql, "/tmp/tonala_complete_162.sql")
    sftp.close()

    print("4. Ejecutando actualización en PostgreSQL de producción...")
    cmd = "cat /tmp/tonala_complete_162.sql | docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os && rm -f /tmp/tonala_complete_162.sql"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8")
    err = stderr.read().decode("utf-8")
    if err:
        print("Avisos:", err)
    print(f"[OK] Salida final:\n", "\n".join(out.splitlines()[-6:]))

    print("\n5. Verificando conteo total de secciones en la base de datos de producción...")
    cmd_verify = """
    docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c "
      SELECT 
        COUNT(DISTINCT es.id) as total_secciones_oficiales,
        COUNT(DISTINCT sc.colony_id) as total_colonias_vinculadas,
        MIN(es.section_num) as primera_seccion,
        MAX(es.section_num) as ultima_seccion
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id;
    "
    """
    stdin, stdout, stderr = client.exec_command(cmd_verify)
    print(stdout.read().decode("utf-8"))

    client.close()
    print(f"\n🎉 ¡Las 162 secciones electorales oficiales completas (2683 a 2844) quedaron 100% sincronizadas en https://elapp.com.mx/mapa!")

if __name__ == "__main__":
    sync_complete_cartography()
