import "dotenv/config";
import pg from "pg";
import { loadAppEnv } from "../../packages/config/index.js";
import { OFFICIAL_TONALA_SECTIONS, SectionDefinition, boundsToRealisticPolygon } from "./generate-official-sections.js";

const env = loadAppEnv();
const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

export type MetropolitanSectionDefinition = SectionDefinition & {
  municipality: string;
};

export const METROPOLITAN_SECTIONS: MetropolitanSectionDefinition[] = [
  // 1. Tonalá (46 sections)
  ...OFFICIAL_TONALA_SECTIONS.map(s => ({ ...s, municipality: "Tonalá" })),

  // 2. Guadalajara (Municipio 039)
  {
    sectionNum: 950,
    nominalListCount: 3200,
    district: 9,
    municipality: "Guadalajara",
    colonies: ["Guadalajara Centro", "San Juan de Dios", "Las Nueve Esquinas"],
    bounds: { minLng: -103.355, maxLng: -103.340, minLat: 20.670, maxLat: 20.685 }
  },
  {
    sectionNum: 1010,
    nominalListCount: 3450,
    district: 9,
    municipality: "Guadalajara",
    colonies: ["Oblatos", "Santa Cecilia", "San Onofre"],
    bounds: { minLng: -103.325, maxLng: -103.295, minLat: 20.685, maxLat: 20.710 }
  },
  {
    sectionNum: 1050,
    nominalListCount: 2900,
    district: 11,
    municipality: "Guadalajara",
    colonies: ["Huentitán el Alto", "Huentitán el Bajo", "Rancho Nuevo"],
    bounds: { minLng: -103.325, maxLng: -103.295, minLat: 20.710, maxLat: 20.735 }
  },
  {
    sectionNum: 1100,
    nominalListCount: 3100,
    district: 14,
    municipality: "Guadalajara",
    colonies: ["Miravalle Guadalajara", "Polanco", "Echeverría"],
    bounds: { minLng: -103.365, maxLng: -103.340, minLat: 20.620, maxLat: 20.645 }
  },
  {
    sectionNum: 1150,
    nominalListCount: 3300,
    district: 8,
    municipality: "Guadalajara",
    colonies: ["Providencia", "Lomas del Valle", "Colinas de San Javier"],
    bounds: { minLng: -103.390, maxLng: -103.365, minLat: 20.685, maxLat: 20.715 }
  },
  {
    sectionNum: 1200,
    nominalListCount: 2850,
    district: 8,
    municipality: "Guadalajara",
    colonies: ["Colonia Americana", "Moderna", "Chapultepec"],
    bounds: { minLng: -103.375, maxLng: -103.355, minLat: 20.660, maxLat: 20.675 }
  },
  {
    sectionNum: 1250,
    nominalListCount: 3400,
    district: 11,
    municipality: "Guadalajara",
    colonies: ["Tetlán", "Insurgentes", "San Andrés"],
    bounds: { minLng: -103.310, maxLng: -103.285, minLat: 20.655, maxLat: 20.680 }
  },
  {
    sectionNum: 1300,
    nominalListCount: 2950,
    district: 8,
    municipality: "Guadalajara",
    colonies: ["Santa Teresita", "Villaseñor", "Ladrón de Guevara"],
    bounds: { minLng: -103.375, maxLng: -103.355, minLat: 20.675, maxLat: 20.690 }
  },
  {
    sectionNum: 1350,
    nominalListCount: 3050,
    district: 14,
    municipality: "Guadalajara",
    colonies: ["Jardines de la Cruz", "Higuerillas", "Fresno"],
    bounds: { minLng: -103.385, maxLng: -103.360, minLat: 20.640, maxLat: 20.660 }
  },
  {
    sectionNum: 1400,
    nominalListCount: 2750,
    district: 11,
    municipality: "Guadalajara",
    colonies: ["Atlas", "Olímpica", "Quinta Velarde"],
    bounds: { minLng: -103.335, maxLng: -103.310, minLat: 20.645, maxLat: 20.665 }
  },

  // 3. San Pedro Tlaquepaque (Municipio 098)
  {
    sectionNum: 2480,
    nominalListCount: 3200,
    district: 16,
    municipality: "San Pedro Tlaquepaque",
    colonies: ["Tlaquepaque Centro", "El Parián", "San Pedrito"],
    bounds: { minLng: -103.325, maxLng: -103.300, minLat: 20.630, maxLat: 20.650 }
  },
  {
    sectionNum: 2500,
    nominalListCount: 3100,
    district: 16,
    municipality: "San Pedro Tlaquepaque",
    colonies: ["Las Juntas", "Miravalle Tlaquepaque", "Guayabitos"],
    bounds: { minLng: -103.355, maxLng: -103.325, minLat: 20.605, maxLat: 20.630 }
  },
  {
    sectionNum: 2520,
    nominalListCount: 2850,
    district: 16,
    municipality: "San Pedro Tlaquepaque",
    colonies: ["Santa Anita", "San Sebastián Tlaquepaque", "La Tijera"],
    bounds: { minLng: -103.420, maxLng: -103.380, minLat: 20.550, maxLat: 20.585 }
  },
  {
    sectionNum: 2540,
    nominalListCount: 3300,
    district: 16,
    municipality: "San Pedro Tlaquepaque",
    colonies: ["Cerro del Cuatro", "Buenos Aires", "Francisco I. Madero"],
    bounds: { minLng: -103.365, maxLng: -103.335, minLat: 20.590, maxLat: 20.615 }
  },
  {
    sectionNum: 2560,
    nominalListCount: 2950,
    district: 13,
    municipality: "San Pedro Tlaquepaque",
    colonies: ["San Martín de las Flores de Abajo", "San Martín de Arriba"],
    bounds: { minLng: -103.295, maxLng: -103.265, minLat: 20.585, maxLat: 20.615 }
  },
  {
    sectionNum: 2580,
    nominalListCount: 2700,
    district: 16,
    municipality: "San Pedro Tlaquepaque",
    colonies: ["Santa María Tequepexpan", "Paseos del Prado"],
    bounds: { minLng: -103.410, maxLng: -103.375, minLat: 20.585, maxLat: 20.615 }
  },
  {
    sectionNum: 2600,
    nominalListCount: 2800,
    district: 13,
    municipality: "San Pedro Tlaquepaque",
    colonies: ["El Vergel", "Artesanos", "Las Huertas"],
    bounds: { minLng: -103.335, maxLng: -103.305, minLat: 20.605, maxLat: 20.630 }
  },
  {
    sectionNum: 2610,
    nominalListCount: 2650,
    district: 13,
    municipality: "San Pedro Tlaquepaque",
    colonies: ["Tateposco", "Quintero", "Álamo Oriente"],
    bounds: { minLng: -103.295, maxLng: -103.275, minLat: 20.615, maxLat: 20.635 }
  },

  // 4. Zapopan (Municipio 120)
  {
    sectionNum: 2900,
    nominalListCount: 3400,
    district: 10,
    municipality: "Zapopan",
    colonies: ["Zapopan Centro", "Seattle", "Tepeyac Zapopan"],
    bounds: { minLng: -103.395, maxLng: -103.370, minLat: 20.710, maxLat: 20.735 }
  },
  {
    sectionNum: 2950,
    nominalListCount: 3600,
    district: 4,
    municipality: "Zapopan",
    colonies: ["Tabachines", "Auditorio", "Villas de Guadalupe"],
    bounds: { minLng: -103.365, maxLng: -103.335, minLat: 20.730, maxLat: 20.760 }
  },
  {
    sectionNum: 3000,
    nominalListCount: 3150,
    district: 10,
    municipality: "Zapopan",
    colonies: ["Las Águilas", "Arboledas Zapopan", "Paseos del Sol"],
    bounds: { minLng: -103.425, maxLng: -103.395, minLat: 20.635, maxLat: 20.665 }
  },
  {
    sectionNum: 3050,
    nominalListCount: 3300,
    district: 6,
    municipality: "Zapopan",
    colonies: ["Miramar Zapopan", "Arenales Tapatíos", "El Colli Urbano"],
    bounds: { minLng: -103.450, maxLng: -103.420, minLat: 20.640, maxLat: 20.670 }
  },
  {
    sectionNum: 3100,
    nominalListCount: 2900,
    district: 4,
    municipality: "Zapopan",
    colonies: ["Tesistán", "Santa Lucía Zapopan", "Nextipac"],
    bounds: { minLng: -103.500, maxLng: -103.440, minLat: 20.750, maxLat: 20.800 }
  },
  {
    sectionNum: 3150,
    nominalListCount: 3250,
    district: 6,
    municipality: "Zapopan",
    colonies: ["Santa Margarita", "Tuzanía", "Altagracia"],
    bounds: { minLng: -103.435, maxLng: -103.405, minLat: 20.715, maxLat: 20.745 }
  },
  {
    sectionNum: 3200,
    nominalListCount: 3100,
    district: 6,
    municipality: "Zapopan",
    colonies: ["San Juan de Ocotán", "Jocotán", "Ciudad Granja"],
    bounds: { minLng: -103.455, maxLng: -103.425, minLat: 20.680, maxLat: 20.715 }
  },
  {
    sectionNum: 3250,
    nominalListCount: 3500,
    district: 10,
    municipality: "Zapopan",
    colonies: ["Valle Real", "Puerta de Hierro", "Jardines del Valle"],
    bounds: { minLng: -103.435, maxLng: -103.405, minLat: 20.700, maxLat: 20.725 }
  },

  // 5. Tlajomulco de Zúñiga (Municipio 097)
  {
    sectionNum: 2360,
    nominalListCount: 3100,
    district: 12,
    municipality: "Tlajomulco de Zúñiga",
    colonies: ["Tlajomulco Centro", "San Agustín Tlajomulco", "La Noria"],
    bounds: { minLng: -103.460, maxLng: -103.420, minLat: 20.460, maxLat: 20.495 }
  },
  {
    sectionNum: 2380,
    nominalListCount: 3800,
    district: 12,
    municipality: "Tlajomulco de Zúñiga",
    colonies: ["Santa Fe Tlajomulco", "Chulavista", "Villa Fontana Aqua"],
    bounds: { minLng: -103.400, maxLng: -103.350, minLat: 20.500, maxLat: 20.540 }
  },
  {
    sectionNum: 2400,
    nominalListCount: 2900,
    district: 12,
    municipality: "Tlajomulco de Zúñiga",
    colonies: ["Santa Cruz del Valle", "El Manantial Tlajomulco"],
    bounds: { minLng: -103.370, maxLng: -103.330, minLat: 20.520, maxLat: 20.555 }
  },
  {
    sectionNum: 2420,
    nominalListCount: 3400,
    district: 12,
    municipality: "Tlajomulco de Zúñiga",
    colonies: ["Los Cántaros", "Lomas del Sur", "Arvento"],
    bounds: { minLng: -103.370, maxLng: -103.320, minLat: 20.450, maxLat: 20.490 }
  },
  {
    sectionNum: 2440,
    nominalListCount: 2750,
    district: 12,
    municipality: "Tlajomulco de Zúñiga",
    colonies: ["San Sebastián el Grande", "San Miguel Cuyutlán", "Cajititlán"],
    bounds: { minLng: -103.440, maxLng: -103.380, minLat: 20.420, maxLat: 20.465 }
  },

  // 6. El Salto (Municipio 070)
  {
    sectionNum: 660,
    nominalListCount: 3200,
    district: 20,
    municipality: "El Salto",
    colonies: ["El Salto Centro", "Las Pintas El Salto", "San José del Quince"],
    bounds: { minLng: -103.260, maxLng: -103.220, minLat: 20.505, maxLat: 20.540 }
  },
  {
    sectionNum: 670,
    nominalListCount: 2900,
    district: 20,
    municipality: "El Salto",
    colonies: ["Las Pintitas", "El Verde El Salto", "La Huizachera"],
    bounds: { minLng: -103.280, maxLng: -103.245, minLat: 20.530, maxLat: 20.565 }
  },
  {
    sectionNum: 680,
    nominalListCount: 2850,
    district: 20,
    municipality: "El Salto",
    colonies: ["San José del Castillo", "El Castillo", "El Muelle"],
    bounds: { minLng: -103.225, maxLng: -103.185, minLat: 20.510, maxLat: 20.545 }
  },
  {
    sectionNum: 690,
    nominalListCount: 3100,
    district: 20,
    municipality: "El Salto",
    colonies: ["Galaxia Bonito Jalisco", "Santa Rosa del Valle"],
    bounds: { minLng: -103.250, maxLng: -103.210, minLat: 20.480, maxLat: 20.515 }
  },

  // 7. Zapotlanejo (Municipio 124)
  {
    sectionNum: 3360,
    nominalListCount: 2900,
    district: 3,
    municipality: "Zapotlanejo",
    colonies: ["Zapotlanejo Centro", "La Laja Zapotlanejo"],
    bounds: { minLng: -103.110, maxLng: -103.040, minLat: 20.610, maxLat: 20.650 }
  },
  {
    sectionNum: 3370,
    nominalListCount: 2400,
    district: 3,
    municipality: "Zapotlanejo",
    colonies: ["Santa Fe Zapotlanejo", "San José de las Flores Oriente"],
    bounds: { minLng: -103.140, maxLng: -103.080, minLat: 20.640, maxLat: 20.680 }
  },
  {
    sectionNum: 3380,
    nominalListCount: 2200,
    district: 3,
    municipality: "Zapotlanejo",
    colonies: ["El Salitre Zapotlanejo", "La Purísima"],
    bounds: { minLng: -103.170, maxLng: -103.110, minLat: 20.580, maxLat: 20.620 }
  },

  // 8. Ixtlahuacán de los Membrillos & Juanacatlán
  {
    sectionNum: 1620,
    nominalListCount: 2800,
    district: 20,
    municipality: "Ixtlahuacán de los Membrillos",
    colonies: ["Ixtlahuacán Centro", "Atequiza", "La Capilla"],
    bounds: { minLng: -103.220, maxLng: -103.150, minLat: 20.380, maxLat: 20.440 }
  },
  {
    sectionNum: 1780,
    nominalListCount: 2600,
    district: 20,
    municipality: "Juanacatlán",
    colonies: ["Juanacatlán Centro", "La Aurora Juanacatlán", "Miraflores"],
    bounds: { minLng: -103.190, maxLng: -103.130, minLat: 20.480, maxLat: 20.530 }
  }
];

export async function runGenerateMetropolitanSections() {
  console.log(`Starting generation of ${METROPOLITAN_SECTIONS.length} electoral sections across Jalisco Metropolitan Area...`);

  try {
    // 1. Get or create catalog version
    const catRes = await pool.query<{ id: string }>(
      "SELECT id FROM catalog_versions ORDER BY imported_at DESC LIMIT 1"
    );
    let catalogVersionId = catRes.rows[0]?.id;
    if (!catalogVersionId) {
      const newCat = await pool.query<{ id: string }>(
        `INSERT INTO catalog_versions (catalog_type, source_name, source_version) 
         VALUES ('colonies', 'jalisco-metropolitan-official', '2026-metro-v1') 
         RETURNING id`
      );
      catalogVersionId = newCat.rows[0]!.id;
    }

    // 2. Insert all colonies for all municipalities
    console.log("Upserting colonies across all municipalities...");
    const colonyIdMap = new Map<string, string>();

    for (const sec of METROPOLITAN_SECTIONS) {
      for (const colName of sec.colonies) {
        const colRes = await pool.query<{ id: string }>(
          `
            INSERT INTO colonies (catalog_version_id, name, postal_code, municipality, status)
            VALUES ($1, $2, '45400', $3, 'active')
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = EXCLUDED.municipality, status = 'active'
            RETURNING id
          `,
          [catalogVersionId, colName, sec.municipality]
        );
        if (colRes.rows[0]) {
          colonyIdMap.set(colName, colRes.rows[0].id);
        }
      }
    }

    // 3. Upsert all electoral sections with accurate realistic geometries
    console.log(`Upserting ${METROPOLITAN_SECTIONS.length} metropolitan electoral sections...`);
    const sectionIdMap = new Map<number, string>();

    for (const sec of METROPOLITAN_SECTIONS) {
      const geom = boundsToRealisticPolygon(sec.sectionNum, sec.bounds);
      const secRes = await pool.query<{ id: string }>(
        `
          INSERT INTO electoral_sections (section_num, geom_json)
          VALUES ($1, $2)
          ON CONFLICT (section_num) DO UPDATE 
          SET geom_json = EXCLUDED.geom_json
          RETURNING id
        `,
        [sec.sectionNum, JSON.stringify(geom)]
      );

      const sectionId = secRes.rows[0]?.id;
      if (sectionId) {
        sectionIdMap.set(sec.sectionNum, sectionId);

        // Link section to its colonies
        for (const colName of sec.colonies) {
          const colId = colonyIdMap.get(colName);
          if (colId) {
            await pool.query(
              `
                INSERT INTO section_colonies (section_id, colony_id)
                VALUES ($1, $2)
                ON CONFLICT (section_id, colony_id) DO NOTHING
              `,
              [sectionId, colId]
            );
          }
        }
      }
    }

    // 4. Get demo users to assign as representatives
    const usersRes = await pool.query<{ id: string }>("SELECT id FROM user_profiles ORDER BY created_at ASC");
    const users = usersRes.rows;
    const adminUser = users[0]!.id;

    console.log("Assigning electoral representatives across all metropolitan sections...");
    for (let i = 0; i < METROPOLITAN_SECTIONS.length; i++) {
      const secDef = METROPOLITAN_SECTIONS[i]!;
      const sectionId = sectionIdMap.get(secDef.sectionNum);
      if (!sectionId) continue;

      const rcUser = users[i % users.length]!;
      const rgUser = users[(i + 1) % users.length]!;

      await pool.query(
        `
          INSERT INTO electoral_representatives (section_id, user_id, role)
          VALUES ($1, $2, 'casilla_responsible')
          ON CONFLICT (section_id, user_id) DO UPDATE SET role = 'casilla_responsible'
        `,
        [sectionId, rcUser.id]
      );

      if (rgUser.id !== rcUser.id) {
        await pool.query(
          `
            INSERT INTO electoral_representatives (section_id, user_id, role)
            VALUES ($1, $2, 'general_responsible')
            ON CONFLICT (section_id, user_id) DO UPDATE SET role = 'general_responsible'
          `,
          [sectionId, rgUser.id]
        );
      }
    }

    // 5. Populate realistic contacts across all metropolitan sections
    console.log("Populating contacts across all metropolitan sections...");
    const sampleFirstNames = ["José", "María", "Juan", "Guadalupe", "Francisco", "Juana", "Antonio", "Margarita", "Jesús", "Rosa", "Pedro", "Esperanza", "Alejandro", "Teresa", "Manuel", "Leticia", "Carlos", "Martha", "Miguel", "Patricia", "David", "Silvia", "Fernando", "Elena", "Jorge", "Adriana", "Luis", "Beatriz", "Ricardo", "Gloria", "Eduardo", "Yolanda", "Javier", "Verónica", "Arturo", "Gabriela", "Sergio", "Alicia", "Roberto", "Socorro", "Raúl", "Irma", "Mario", "Carmen", "Daniel", "Laura", "Héctor"];
    const sampleSurnames = ["González", "Rodríguez", "Hernández", "García", "Martínez", "López", "Pérez", "Sánchez", "Ramírez", "Cruz", "Flores", "Gómez", "Morales", "Vázquez", "Reyes", "Jiménez", "Torres", "Díaz", "Gutiérrez", "Mendoza", "Ruiz", "Aguilar", "Ortiz", "Moreno", "Castillo", "Romero", "Álvarez", "Méndez", "Chávez", "Rivera", "Juárez", "Ramos", "Domínguez", "Herrera", "Medina", "Castro", "Vargas", "Guzmán", "Velázquez", "Ríos"];

    for (let i = 0; i < METROPOLITAN_SECTIONS.length; i++) {
      const secDef = METROPOLITAN_SECTIONS[i]!;
      const sectionId = sectionIdMap.get(secDef.sectionNum);
      if (!sectionId) continue;

      for (let k = 0; k < 3; k++) {
        const fn = sampleFirstNames[(i * 3 + k) % sampleFirstNames.length]!;
        const ln1 = sampleSurnames[(i * 5 + k) % sampleSurnames.length]!;
        const ln2 = sampleSurnames[(i * 7 + k + 1) % sampleSurnames.length]!;
        const displayName = `${fn} ${ln1} ${ln2}`;
        const phone = `33${20000000 + i * 1000 + k * 19}`;

        await pool.query(
          `
            INSERT INTO contacts (id, display_name, phone, section_id, status, created_by_user_id, created_at, version)
            VALUES (gen_random_uuid(), $1, $2, $3, 'active', $4, now(), 1)
            ON CONFLICT DO NOTHING
          `,
          [displayName, phone, sectionId, adminUser]
        );
      }
    }

    console.log(`✓ All ${METROPOLITAN_SECTIONS.length} electoral sections across 8 municipalities generated and seeded successfully!`);
  } catch (err) {
    console.error("Error generating metropolitan sections:", err);
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.includes("generate-metropolitan-sections")) {
  runGenerateMetropolitanSections();
}
