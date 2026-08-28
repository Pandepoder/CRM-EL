import "dotenv/config";
import pg from "pg";
import { loadAppEnv } from "../../packages/config/index.js";

const env = loadAppEnv();
const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

async function seedSectionsOperationalData() {
  console.log("Seeding operational data across all 12 electoral sections...");

  try {
    // 1. Get all electoral sections
    const sectionsRes = await pool.query<{ id: string; section_num: number }>(
      "SELECT id, section_num FROM electoral_sections ORDER BY section_num ASC"
    );
    const sections = sectionsRes.rows;
    console.log(`Found ${sections.length} electoral sections in database.`);

    // 2. Get demo users
    const usersRes = await pool.query<{ id: string; display_name: string }>(
      "SELECT id, display_name FROM user_profiles ORDER BY created_at ASC"
    );
    const users = usersRes.rows;

    if (users.length === 0) {
      console.warn("No users found.");
      return;
    }

    const adminUser = users[0]!.id;

    // 3. Assign Electoral Representatives (RC / RG) to every section
    console.log("Assigning Electoral Representatives (RC / RG)...");
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]!;
      const rcUser = users[i % users.length]!;
      const rgUser = users[(i + 1) % users.length]!;

      await pool.query(
        `
          INSERT INTO electoral_representatives (section_id, user_id, role)
          VALUES ($1, $2, 'casilla_responsible')
          ON CONFLICT (section_id, user_id) DO UPDATE SET role = 'casilla_responsible'
        `,
        [section.id, rcUser.id]
      );

      if (rgUser.id !== rcUser.id) {
        await pool.query(
          `
            INSERT INTO electoral_representatives (section_id, user_id, role)
            VALUES ($1, $2, 'general_responsible')
            ON CONFLICT (section_id, user_id) DO UPDATE SET role = 'general_responsible'
          `,
          [section.id, rgUser.id]
        );
      }
    }

    // 4. Update contacts so they are linked to sections if they have none
    console.log("Distributing contacts across sections...");
    const contactsRes = await pool.query<{ id: string }>("SELECT id FROM contacts ORDER BY created_at ASC");
    const contacts = contactsRes.rows;

    for (let i = 0; i < contacts.length; i++) {
      const assignedSection = sections[i % sections.length]!;
      await pool.query(
        "UPDATE contacts SET section_id = $1 WHERE id = $2",
        [assignedSection.id, contacts[i]!.id]
      );
    }

    // 5. Seed some additional realistic contacts if total contacts < 36
    if (contacts.length < 36) {
      console.log("Adding representative contacts across all sections...");
      const sampleNames: [string, string, string][] = [
        ["Roberto", "García", "López"],
        ["María Elena", "Hernández", "Torres"],
        ["Carlos", "González", "Martínez"],
        ["Lucía", "Ramírez", "Díaz"],
        ["Jorge", "Vázquez", "Morales"],
        ["Ana Sofía", "Mendoza", "Sánchez"],
        ["Fernando", "Castro", "Rios"],
        ["Patricia", "Flores", "Jiménez"],
        ["Miguel Ángel", "Navarro", "Gutiérrez"],
        ["Adriana", "Ruiz", "Vargas"],
        ["Salvador", "Aguilar", "Cruz"],
        ["Gabriela", "Reyes", "Pérez"],
        ["Héctor", "Ortiz", "Molina"],
        ["Daniela", "Silva", "Gómez"],
        ["Alejandro", "Peña", "Cervantes"],
        ["Rosa María", "Delgado", "Guerrero"],
        ["Eduardo", "Ramos", "Lara"],
        ["Verónica", "Campos", "Vega"],
        ["Guillermo", "Medina", "Romero"],
        ["Claudia", "Ibarra", "Cortés"],
        ["Armando", "Pacheco", "Soto"],
        ["Teresa", "Valdez", "Salinas"],
        ["Javier", "Guzmán", "Solís"],
        ["Karina", "Rangel", "Paredes"]
      ];

      for (let i = 0; i < sampleNames.length; i++) {
        const [firstName, firstSurname, secondSurname] = sampleNames[i]!;
        const section = sections[i % sections.length]!;
        const phone = `33${30000000 + i * 137}`;
        
        await pool.query(
          `
            INSERT INTO contacts (first_name, first_surname, second_surname, phone, section_id, status, created_by_user_id)
            VALUES ($1, $2, $3, $4, $5, 'active', $6)
            ON CONFLICT DO NOTHING
          `,
          [firstName, firstSurname, secondSurname, phone, section.id, adminUser]
        );
      }
    }

    // 6. Create sample territorial event reports across the sections
    console.log("Seeding sample incident reports...");
    const sampleIncidents = [
      { title: "Bacheo urgente en avenida principal", description: "Múltiples baches que dificultan el tránsito de brigadas.", category: "servicios", sectionNum: 2704, lat: 20.6260, lng: -103.2410 },
      { title: "Luminaria pública apagada", description: "Falta de alumbrado reportado por vecinos.", category: "servicios", sectionNum: 2705, lat: 20.6380, lng: -103.2620 },
      { title: "Mitin Vecinal y Entrega de Propuestas", description: "Reunión programada con líderes de colonia.", category: "mitin", sectionNum: 2706, lat: 20.6290, lng: -103.2250 },
      { title: "Retiro de propaganda no autorizada", description: "Lonas colocadas en mobiliario urbano.", category: "propaganda", sectionNum: 2707, lat: 20.6550, lng: -103.2550 },
      { title: "Falla en suministro de agua potable", description: "Baja presión reportada en 3 manzanas.", category: "servicios", sectionNum: 2708, lat: 20.6120, lng: -103.2450 },
      { title: "Brigada de volanteo casa por casa", description: "Recorrido territorial completado satisfactoriamente.", category: "brigada", sectionNum: 2709, lat: 20.6390, lng: -103.2490 },
      { title: "Petición ciudadana de poda de árboles", description: "Ramas obstruyendo visibilidad y cables.", category: "servicios", sectionNum: 2710, lat: 20.6720, lng: -103.2600 },
      { title: "Reunión de estructura de casilla", description: "Capacitación a representantes generales y de casilla.", category: "mitin", sectionNum: 2711, lat: 20.5950, lng: -103.2280 },
      { title: "Supervisión de casilla extraordinaria", description: "Revisión de accesos y ubicación de mamparas.", category: "incidencia", sectionNum: 2712, lat: 20.5980, lng: -103.1900 },
      { title: "Entrega de nombramientos de representantes", description: "Entrega de gafetes y acreditaciones.", category: "brigada", sectionNum: 2713, lat: 20.6550, lng: -103.2750 },
      { title: "Reporte de semáforo intermitente", description: "Cruce escolar con semáforo desincronizado.", category: "servicios", sectionNum: 2714, lat: 20.6160, lng: -103.2420 },
      { title: "Censo de simpatizantes de nueva afiliación", description: "Registro de 15 nuevos simpatizantes en la sección.", category: "brigada", sectionNum: 2715, lat: 20.6500, lng: -103.2250 }
    ];

    for (const inc of sampleIncidents) {
      const sec = sections.find(s => s.section_num === inc.sectionNum) || sections[0]!;
      await pool.query(
        `
          INSERT INTO event_reports (title, description, category, status, municipality, section_id, latitude, longitude, created_by_user_id)
          VALUES ($1, $2, $3, 'active', 'Tonalá', $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `,
        [inc.title, inc.description, inc.category, sec.id, inc.lat, inc.lng, adminUser]
      );
    }

    console.log("Operational data seeding completed successfully across all 12 sections!");
  } catch (error) {
    console.error("Error seeding operational data:", error);
  } finally {
    await pool.end();
  }
}

seedSectionsOperationalData();
