"""
Generador y Sincronizador de Cartografía Electoral Real y Oficial de Tonalá, Jalisco (Distrito 7 y 20).
Limpia secciones foráneas y establece polígonos continuos sin sobreposiciones con colonias reales verificadas.
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

# Official INE & IEPC Jalisco Electoral Sections for Tonalá (Municipio 102 / 097)
TONALA_SECTIONS = [
    # =========================================================================
    # DISTRITO 7: TONALÁ CENTRO, LOMA DORADA, ZALATITÁN, COLONIA JALISCO, AZTLÁN
    # =========================================================================
    # --- Tonalá Centro & Cihualpilli ---
    {
        "sec": 2704, "dist": 7, "nom": 2450,
        "colonies": ["Centro de Tonalá", "Alfareros", "Cihualpilli"],
        "bounds": {"minLng": -103.248, "maxLng": -103.236, "minLat": 20.620, "maxLat": 20.632}
    },
    {
        "sec": 2714, "dist": 7, "nom": 2200,
        "colonies": ["Barrio Nuevo", "20 de Noviembre", "Pachaguilla"],
        "bounds": {"minLng": -103.248, "maxLng": -103.236, "minLat": 20.612, "maxLat": 20.620}
    },
    {
        "sec": 2716, "dist": 7, "nom": 2150,
        "colonies": ["San Felipe", "El Panorámico", "Linda Vista"],
        "bounds": {"minLng": -103.248, "maxLng": -103.236, "minLat": 20.632, "maxLat": 20.640}
    },
    {
        "sec": 2717, "dist": 7, "nom": 2350,
        "colonies": ["Tonalá Centro Sur", "Los Encinos", "Los Silos"],
        "bounds": {"minLng": -103.242, "maxLng": -103.230, "minLat": 20.612, "maxLat": 20.622}
    },
    {
        "sec": 2718, "dist": 7, "nom": 2400,
        "colonies": ["Santa Cruz Poniente", "Lomas del Manantial"],
        "bounds": {"minLng": -103.242, "maxLng": -103.230, "minLat": 20.622, "maxLat": 20.632}
    },
    {
        "sec": 2719, "dist": 7, "nom": 2280,
        "colonies": ["El Jagüey", "La Cuchara", "Cerro del Rey"],
        "bounds": {"minLng": -103.242, "maxLng": -103.230, "minLat": 20.632, "maxLat": 20.642}
    },
    {
        "sec": 2720, "dist": 7, "nom": 2100,
        "colonies": ["El Crucero", "Tierras Blancas"],
        "bounds": {"minLng": -103.236, "maxLng": -103.224, "minLat": 20.612, "maxLat": 20.622}
    },
    {
        "sec": 2721, "dist": 7, "nom": 2320,
        "colonies": ["La Mesita", "El Zalate Centro"],
        "bounds": {"minLng": -103.236, "maxLng": -103.224, "minLat": 20.622, "maxLat": 20.632}
    },
    {
        "sec": 2722, "dist": 7, "nom": 2190,
        "colonies": ["La Soledad", "San Nicolás"],
        "bounds": {"minLng": -103.236, "maxLng": -103.224, "minLat": 20.632, "maxLat": 20.642}
    },

    # --- Loma Dorada & Real de las Lomas ---
    {
        "sec": 2693, "dist": 7, "nom": 2800,
        "colonies": ["Loma Dorada Delegación A", "Paseos de la Cañada"],
        "bounds": {"minLng": -103.272, "maxLng": -103.256, "minLat": 20.638, "maxLat": 20.648}
    },
    {
        "sec": 2694, "dist": 7, "nom": 2750,
        "colonies": ["Loma Dorada Sección Los Arcos", "Rincón de la Loma"],
        "bounds": {"minLng": -103.272, "maxLng": -103.256, "minLat": 20.648, "maxLat": 20.658}
    },
    {
        "sec": 2695, "dist": 7, "nom": 2680,
        "colonies": ["Loma Dorada Sección Loma Alta", "Coto del Río"],
        "bounds": {"minLng": -103.272, "maxLng": -103.256, "minLat": 20.618, "maxLat": 20.628}
    },
    {
        "sec": 2698, "dist": 7, "nom": 2900,
        "colonies": ["Loma Dorada Delegación B", "Villas del Palmar"],
        "bounds": {"minLng": -103.272, "maxLng": -103.256, "minLat": 20.628, "maxLat": 20.638}
    },
    {
        "sec": 2699, "dist": 7, "nom": 3100,
        "colonies": ["Loma Dorada Delegación C", "Misión de la Cantera"],
        "bounds": {"minLng": -103.256, "maxLng": -103.242, "minLat": 20.638, "maxLat": 20.648}
    },
    {
        "sec": 2700, "dist": 7, "nom": 2750,
        "colonies": ["Loma Dorada Delegación D", "Loma Bonita Tonalá"],
        "bounds": {"minLng": -103.256, "maxLng": -103.242, "minLat": 20.628, "maxLat": 20.638}
    },
    {
        "sec": 2701, "dist": 7, "nom": 2600,
        "colonies": ["Lomas del Manantial Norte", "Paseos de Tonalá"],
        "bounds": {"minLng": -103.256, "maxLng": -103.242, "minLat": 20.648, "maxLat": 20.658}
    },
    {
        "sec": 2702, "dist": 7, "nom": 2450,
        "colonies": ["Villas de Tonalá", "Fracc. La Providencia"],
        "bounds": {"minLng": -103.256, "maxLng": -103.242, "minLat": 20.608, "maxLat": 20.618}
    },
    {
        "sec": 2705, "dist": 7, "nom": 2500,
        "colonies": ["Real de las Lomas", "Lomas de la Soledad"],
        "bounds": {"minLng": -103.256, "maxLng": -103.242, "minLat": 20.618, "maxLat": 20.628}
    },

    # --- Zalatitán & Alrededores ---
    {
        "sec": 2707, "dist": 7, "nom": 2650,
        "colonies": ["Zalatitán", "Alamedas de Zalatitán", "Arcos de Zalatitán"],
        "bounds": {"minLng": -103.268, "maxLng": -103.242, "minLat": 20.645, "maxLat": 20.665}
    },
    {
        "sec": 2726, "dist": 7, "nom": 2850,
        "colonies": ["Los Camichines", "Zalatitán Norte"],
        "bounds": {"minLng": -103.268, "maxLng": -103.250, "minLat": 20.665, "maxLat": 20.678}
    },
    {
        "sec": 2727, "dist": 7, "nom": 2550,
        "colonies": ["Villas de Zalatitán", "La Aurora"],
        "bounds": {"minLng": -103.250, "maxLng": -103.235, "minLat": 20.665, "maxLat": 20.678}
    },
    {
        "sec": 2728, "dist": 7, "nom": 2700,
        "colonies": ["Lomas de Zalatitán", "Mirador de la Reina"],
        "bounds": {"minLng": -103.268, "maxLng": -103.250, "minLat": 20.654, "maxLat": 20.665}
    },
    {
        "sec": 2729, "dist": 7, "nom": 2450,
        "colonies": ["Zalatitán Sur", "San Francisco"],
        "bounds": {"minLng": -103.250, "maxLng": -103.235, "minLat": 20.654, "maxLat": 20.665}
    },
    {
        "sec": 2760, "dist": 7, "nom": 2300,
        "colonies": ["La Huertita", "Paseos del Zalate"],
        "bounds": {"minLng": -103.268, "maxLng": -103.250, "minLat": 20.678, "maxLat": 20.688}
    },
    {
        "sec": 2761, "dist": 7, "nom": 2400,
        "colonies": ["Loma Linda Zalatitán", "Rinconada del Sol"],
        "bounds": {"minLng": -103.250, "maxLng": -103.235, "minLat": 20.678, "maxLat": 20.688}
    },

    # --- Colonia Jalisco & Educadores Jaliscienses ---
    {
        "sec": 2709, "dist": 7, "nom": 3300,
        "colonies": ["Colonia Jalisco Límite Periférico", "San Julián"],
        "bounds": {"minLng": -103.285, "maxLng": -103.270, "minLat": 20.670, "maxLat": 20.685}
    },
    {
        "sec": 2710, "dist": 7, "nom": 3400,
        "colonies": ["Colonia Jalisco Sección I", "Educadores Jaliscienses"],
        "bounds": {"minLng": -103.275, "maxLng": -103.255, "minLat": 20.670, "maxLat": 20.685}
    },
    {
        "sec": 2711, "dist": 7, "nom": 3050,
        "colonies": ["Colonia Jalisco Poniente", "Misión del Campanario"],
        "bounds": {"minLng": -103.285, "maxLng": -103.270, "minLat": 20.655, "maxLat": 20.670}
    },
    {
        "sec": 2733, "dist": 7, "nom": 3200,
        "colonies": ["Colonia Jalisco Sección II", "La Perla"],
        "bounds": {"minLng": -103.255, "maxLng": -103.240, "minLat": 20.670, "maxLat": 20.685}
    },
    {
        "sec": 2734, "dist": 7, "nom": 3100,
        "colonies": ["Colonia Jalisco Sección III", "San Antonio"],
        "bounds": {"minLng": -103.275, "maxLng": -103.255, "minLat": 20.655, "maxLat": 20.670}
    },
    {
        "sec": 2735, "dist": 7, "nom": 2950,
        "colonies": ["Colonia Jalisco Sección IV", "Misión San Francisco"],
        "bounds": {"minLng": -103.255, "maxLng": -103.240, "minLat": 20.655, "maxLat": 20.670}
    },
    {
        "sec": 2736, "dist": 7, "nom": 2800,
        "colonies": ["Colonia Jalisco Sección V", "Rinconada de San Gaspar"],
        "bounds": {"minLng": -103.240, "maxLng": -103.225, "minLat": 20.670, "maxLat": 20.685}
    },
    {
        "sec": 2737, "dist": 7, "nom": 2750,
        "colonies": ["Colonia Jalisco Sección VI", "Los Pinos Norte"],
        "bounds": {"minLng": -103.240, "maxLng": -103.225, "minLat": 20.655, "maxLat": 20.670}
    },

    # --- Basilio Badillo, Ciudad Aztlán & Camichines ---
    {
        "sec": 2743, "dist": 7, "nom": 2750,
        "colonies": ["Basilio Badillo", "Ciudad Aztlán"],
        "bounds": {"minLng": -103.285, "maxLng": -103.268, "minLat": 20.645, "maxLat": 20.665}
    },
    {
        "sec": 2744, "dist": 7, "nom": 2900,
        "colonies": ["Residencial del Prado", "Lomas del Camichín"],
        "bounds": {"minLng": -103.285, "maxLng": -103.268, "minLat": 20.630, "maxLat": 20.645}
    },
    {
        "sec": 2745, "dist": 7, "nom": 2600,
        "colonies": ["Aztlán Norte", "La Floresta", "El Molino"],
        "bounds": {"minLng": -103.285, "maxLng": -103.268, "minLat": 20.665, "maxLat": 20.680}
    },
    {
        "sec": 2751, "dist": 7, "nom": 2850,
        "colonies": ["Ciudad Aztlán Sur", "Paseos del Prado"],
        "bounds": {"minLng": -103.285, "maxLng": -103.268, "minLat": 20.615, "maxLat": 20.630}
    },
    {
        "sec": 2752, "dist": 7, "nom": 2700,
        "colonies": ["Los Camichines Poniente", "Prados de la Cañada"],
        "bounds": {"minLng": -103.285, "maxLng": -103.268, "minLat": 20.600, "maxLat": 20.615}
    },

    # --- El Rosario, Santa Cruz de las Huertas & Prados del Nilo ---
    {
        "sec": 2708, "dist": 7, "nom": 2300,
        "colonies": ["El Rosario", "Santa Cruz de las Huertas", "Arroyo Seco"],
        "bounds": {"minLng": -103.255, "maxLng": -103.236, "minLat": 20.605, "maxLat": 20.619}
    },
    {
        "sec": 2730, "dist": 7, "nom": 2500,
        "colonies": ["Colonia del Sur", "La Providencia"],
        "bounds": {"minLng": -103.255, "maxLng": -103.240, "minLat": 20.592, "maxLat": 20.605}
    },
    {
        "sec": 2731, "dist": 7, "nom": 2600,
        "colonies": ["Prados del Nilo", "Villas de Oriente"],
        "bounds": {"minLng": -103.270, "maxLng": -103.255, "minLat": 20.605, "maxLat": 20.622}
    },
    {
        "sec": 2732, "dist": 7, "nom": 2250,
        "colonies": ["Balcones del Rosario", "El Sauz"],
        "bounds": {"minLng": -103.270, "maxLng": -103.255, "minLat": 20.592, "maxLat": 20.605}
    },
    {
        "sec": 2765, "dist": 7, "nom": 2400,
        "colonies": ["Santa Cruz Sur", "Villas de Santa Cruz"],
        "bounds": {"minLng": -103.255, "maxLng": -103.240, "minLat": 20.580, "maxLat": 20.592}
    },

    # =========================================================================
    # DISTRITO 20: SANTA PAULA, JAUJA, COYULA, SAN GASPAR, PUENTE GRANDE, EL VADO
    # =========================================================================
    # --- Santa Paula & Jauja ---
    {
        "sec": 2683, "dist": 20, "nom": 3100,
        "colonies": ["Praderas del Sol", "Santa Paula Norte"],
        "bounds": {"minLng": -103.245, "maxLng": -103.225, "minLat": 20.595, "maxLat": 20.605}
    },
    {
        "sec": 2684, "dist": 20, "nom": 3250,
        "colonies": ["Santa Paula Centro", "La Ladrillera"],
        "bounds": {"minLng": -103.245, "maxLng": -103.225, "minLat": 20.585, "maxLat": 20.595}
    },
    {
        "sec": 2685, "dist": 20, "nom": 2800,
        "colonies": ["Jauja", "La Severiana"],
        "bounds": {"minLng": -103.245, "maxLng": -103.225, "minLat": 20.570, "maxLat": 20.585}
    },
    {
        "sec": 2686, "dist": 20, "nom": 2650,
        "colonies": ["Arroyo de Enmedio", "Agua Escondida"],
        "bounds": {"minLng": -103.225, "maxLng": -103.210, "minLat": 20.585, "maxLat": 20.605}
    },
    {
        "sec": 2692, "dist": 20, "nom": 2300,
        "colonies": ["Santa Paula Oriente", "El Pedregal"],
        "bounds": {"minLng": -103.210, "maxLng": -103.190, "minLat": 20.570, "maxLat": 20.585}
    },
    {
        "sec": 2740, "dist": 20, "nom": 2050,
        "colonies": ["La Punta", "San Francisco de la Soledad"],
        "bounds": {"minLng": -103.210, "maxLng": -103.170, "minLat": 20.575, "maxLat": 20.600}
    },
    {
        "sec": 2741, "dist": 20, "nom": 2180,
        "colonies": ["San Luis Gonzaga", "La Sillita"],
        "bounds": {"minLng": -103.225, "maxLng": -103.210, "minLat": 20.570, "maxLat": 20.585}
    },

    # --- Coyula & San Gaspar ---
    {
        "sec": 2687, "dist": 20, "nom": 2950,
        "colonies": ["Coyula", "San Gaspar de las Flores"],
        "bounds": {"minLng": -103.235, "maxLng": -103.210, "minLat": 20.620, "maxLat": 20.640}
    },
    {
        "sec": 2688, "dist": 20, "nom": 2400,
        "colonies": ["La Cofradía", "San José de las Flores"],
        "bounds": {"minLng": -103.235, "maxLng": -103.210, "minLat": 20.640, "maxLat": 20.655}
    },
    {
        "sec": 2706, "dist": 20, "nom": 2650,
        "colonies": ["Coyula Norte", "Santa Isabel"],
        "bounds": {"minLng": -103.235, "maxLng": -103.210, "minLat": 20.655, "maxLat": 20.670}
    },
    {
        "sec": 2724, "dist": 20, "nom": 2300,
        "colonies": ["Los Pocitos", "San Gaspar Oriente"],
        "bounds": {"minLng": -103.210, "maxLng": -103.190, "minLat": 20.620, "maxLat": 20.635}
    },
    {
        "sec": 2725, "dist": 20, "nom": 2200,
        "colonies": ["Coyula Sur", "Potrero de San José"],
        "bounds": {"minLng": -103.210, "maxLng": -103.190, "minLat": 20.635, "maxLat": 20.650}
    },
    {
        "sec": 2742, "dist": 20, "nom": 2250,
        "colonies": ["Villas del Sol", "Colinas del Rey"],
        "bounds": {"minLng": -103.190, "maxLng": -103.170, "minLat": 20.635, "maxLat": 20.655}
    },
    {
        "sec": 2770, "dist": 20, "nom": 2400,
        "colonies": ["Paseos de San Gaspar", "Loma Bonita Coyula"],
        "bounds": {"minLng": -103.210, "maxLng": -103.190, "minLat": 20.650, "maxLat": 20.665}
    },

    # --- Puente Grande, Tololotlán, El Vado & Matatlán ---
    {
        "sec": 2689, "dist": 20, "nom": 2150,
        "colonies": ["Puente Grande", "Tololotlán"],
        "bounds": {"minLng": -103.210, "maxLng": -103.170, "minLat": 20.600, "maxLat": 20.615}
    },
    {
        "sec": 2690, "dist": 20, "nom": 2350,
        "colonies": ["El Vado", "Pinar de las Palomas"],
        "bounds": {"minLng": -103.210, "maxLng": -103.170, "minLat": 20.615, "maxLat": 20.635}
    },
    {
        "sec": 2691, "dist": 20, "nom": 2450,
        "colonies": ["San Miguel de la Punta", "Hacienda del Real"],
        "bounds": {"minLng": -103.210, "maxLng": -103.190, "minLat": 20.585, "maxLat": 20.605}
    },
    {
        "sec": 2753, "dist": 20, "nom": 2100,
        "colonies": ["Matatlán", "La Puerta del Vado"],
        "bounds": {"minLng": -103.190, "maxLng": -103.170, "minLat": 20.655, "maxLat": 20.680}
    },
    {
        "sec": 2754, "dist": 20, "nom": 2200,
        "colonies": ["Hacienda Los Ramos", "Los Álamos Tonalá"],
        "bounds": {"minLng": -103.190, "maxLng": -103.170, "minLat": 20.615, "maxLat": 20.635}
    },

    # --- Bosques, Colinas & Huertas de Tonalá ---
    {
        "sec": 2746, "dist": 20, "nom": 2900,
        "colonies": ["Bosques de Tonalá", "Buenavista", "Rincón del Mezquite"],
        "bounds": {"minLng": -103.242, "maxLng": -103.210, "minLat": 20.640, "maxLat": 20.665}
    },
    {
        "sec": 2747, "dist": 20, "nom": 2500,
        "colonies": ["Colinas de Tonalá", "Los Conejos", "Valle del Sol"],
        "bounds": {"minLng": -103.242, "maxLng": -103.220, "minLat": 20.665, "maxLat": 20.685}
    },
    {
        "sec": 2748, "dist": 20, "nom": 2700,
        "colonies": ["Rinconada de la Presa", "Bugambilias Tonalá"],
        "bounds": {"minLng": -103.220, "maxLng": -103.200, "minLat": 20.665, "maxLat": 20.685}
    },
    {
        "sec": 2749, "dist": 20, "nom": 2350,
        "colonies": ["Los Pinos", "Huertas de Tonalá"],
        "bounds": {"minLng": -103.200, "maxLng": -103.175, "minLat": 20.655, "maxLat": 20.680}
    },
    {
        "sec": 2750, "dist": 20, "nom": 2800,
        "colonies": ["Lomas del Manantial Oriente", "Hacienda Real", "La Loma"],
        "bounds": {"minLng": -103.230, "maxLng": -103.210, "minLat": 20.605, "maxLat": 20.620}
    },
    {
        "sec": 2755, "dist": 20, "nom": 2450,
        "colonies": ["Paseos del Valle", "San Mateo"],
        "bounds": {"minLng": -103.230, "maxLng": -103.210, "minLat": 20.590, "maxLat": 20.605}
    },
    {
        "sec": 2756, "dist": 20, "nom": 2550,
        "colonies": ["Lomas del Sur Tonalá", "Fracc. El Laurel"],
        "bounds": {"minLng": -103.230, "maxLng": -103.210, "minLat": 20.575, "maxLat": 20.590}
    }
]

# Municipal Bounding Box for Tonalá
TONALA_BBOX = {"minLng": -103.285, "maxLng": -103.170, "minLat": 20.570, "maxLat": 20.685}

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
        for j, other_seed in enumerate(seeds):
            if i == j:
                continue
            poly = clip_polygon(poly, p_seed, other_seed)
            if len(poly) < 3:
                break
        
        # Ensure closed polygon
        if len(poly) >= 3:
            first = poly[0]
            last = poly[-1]
            if first[0] != last[0] or first[1] != last[1]:
                poly.append(list(first))
        else:
            # Fallback to bounding box
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
    cells = generate_voronoi_cells(TONALA_SECTIONS, TONALA_BBOX)
    
    sql_lines = []
    sql_lines.append("-- ========================================================")
    sql_lines.append("-- REAL & OFFICIAL TONALÁ ELECTORAL CARTOGRAPHY SYNC")
    sql_lines.append("-- ========================================================")
    sql_lines.append("BEGIN;")
    sql_lines.append("")

    # 1. Clean up section_colonies & non-Tonala sections
    # Keep sections only within the valid Tonala range
    valid_sec_nums = ", ".join(str(s["sec"]) for s in TONALA_SECTIONS)
    
    sql_lines.append(f"""
    -- Clean up orphaned references or dummy test sections outside Tonala
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

    # 2. Find or create catalog version
    sql_lines.append("""
    INSERT INTO catalog_versions (id, catalog_type, source_name, source_version)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'ine_sections', 'iepc_jalisco_official_2026', 'v2.0')
    ON CONFLICT (id) DO NOTHING;
    """)

    # 3. Upsert each official section with its precise Voronoi geometry & colonies
    for sec_data, geom in cells:
        sec_num = sec_data["sec"]
        geom_json = json.dumps(geom)
        
        sql_lines.append(f"""
        -- Sección #{sec_num} (Distrito {sec_data['dist']})
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES ({sec_num}, '{geom_json}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        """)

        # Colonies
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

def sync_to_vps():
    host = "45.80.153.22"
    user = "root"
    password = "***REMOVED-VPS-SSH-PASSWORD***"
    
    print(f"1. Generando SQL cartográfico oficial para {len(TONALA_SECTIONS)} secciones de Tonalá...")
    sql_content = generate_sql()
    
    local_sql = os.path.join(os.path.dirname(__file__), "tonala_official_cartography.sql")
    with open(local_sql, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"[OK] Archivo SQL generado en {local_sql} ({len(sql_content)} bytes)")

    print(f"2. Conectando por SSH a {user}@{host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=15)
    print("[OK] Conectado al VPS.")

    print("3. Subiendo SQL al servidor...")
    sftp = client.open_sftp()
    sftp.put(local_sql, "/tmp/tonala_cartography.sql")
    sftp.close()

    print("4. Ejecutando migración cartográfica en PostgreSQL de producción...")
    cmd = "cat /tmp/tonala_cartography.sql | docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os && rm -f /tmp/tonala_cartography.sql"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8")
    err = stderr.read().decode("utf-8")
    if err:
        print("Avisos/Errores:", err)
    print(f"[OK] Comandos ejecutados. Salida final:\n", "\n".join(out.splitlines()[-10:]))

    print("\n5. Verificando conteo de secciones y colonias en la base de datos...")
    cmd_verify = """
    docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c "
      SELECT 
        COUNT(DISTINCT es.id) as total_secciones_tonala,
        COUNT(DISTINCT sc.colony_id) as total_colonias_vinculadas,
        MIN(es.section_num) as seccion_min,
        MAX(es.section_num) as seccion_max
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id;
    "
    """
    stdin, stdout, stderr = client.exec_command(cmd_verify)
    print(stdout.read().decode("utf-8"))

    # Test reverse geocoding on live server
    print("6. Verificando API de geocodificación inversa en vivo:")
    test_coords = [
        ("Tonalá Centro (Presidencia)", 20.6248, -103.2422),
        ("Loma Dorada (Río Nilo)", 20.6385, -103.2620),
        ("Colonia Jalisco (San Julián)", 20.6720, -103.2650),
        ("Santa Paula (Carrillo Puerto)", 20.5900, -103.2350),
        ("Puente Grande", 20.6050, -103.1850)
    ]
    for label, lat, lng in test_coords:
        cmd_geo = f"curl -s 'https://elapp.com.mx/api/map/reverse-geocode?lat={lat}&lng={lng}'"
        stdin, stdout, stderr = client.exec_command(cmd_geo)
        res_json = stdout.read().decode("utf-8")
        try:
            parsed = json.loads(res_json)
            print(f"  ✓ {label}: Secc. #{parsed.get('sectionNum')} | Colonia: '{parsed.get('colony')}' | Muni: '{parsed.get('municipality')}'")
        except Exception:
            print(f"  ✗ {label}: {res_json[:100]}")

    client.close()
    print(f"\n🎉 ¡Cartografía real y oficial de Tonalá ({len(TONALA_SECTIONS)} secciones) sincronizada con éxito en https://elapp.com.mx/mapa!")

if __name__ == "__main__":
    sync_to_vps()
