import "dotenv/config";
import pg from "pg";
import { loadAppEnv } from "../../packages/config/index.js";

async function seedInbox() {
  const env = loadAppEnv();
  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

  // Get a few contacts to link
  const contactsRes = await pool.query("SELECT id, display_name, phone FROM contacts LIMIT 3");
  const contacts = contactsRes.rows;

  if (contacts.length === 0) {
    console.log("No contacts to seed inbox with!");
    await pool.end();
    return;
  }

  const { decryptData } = await import("../../packages/shared/database/crypto.js");

  console.log("Seeding inbox conversations...");
  await pool.query("TRUNCATE TABLE inbox_messages, inbox_conversations CASCADE");

  for (const c of contacts) {
    const convId = crypto.randomUUID();
    const rawPhone = c.phone ? decryptData(c.phone) : `+52330000${Math.floor(Math.random()*9999)}`;
    await pool.query(
      `INSERT INTO inbox_conversations (id, contact_id, channel, external_id, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [convId, c.id, "whatsapp", rawPhone, "open"]
    );

    // Insert some messages
    await pool.query(
      `INSERT INTO inbox_messages (id, conversation_id, direction, content) VALUES ($1, $2, $3, $4)`,
      [crypto.randomUUID(), convId, "inbound", `Hola, soy ${c.display_name}. Quisiera reportar un bache.`]
    );

    await pool.query(
      `INSERT INTO inbox_messages (id, conversation_id, direction, content) VALUES ($1, $2, $3, $4)`,
      [crypto.randomUUID(), convId, "outbound", `¡Claro! ¿Me podrías indicar la calle exacta?`]
    );
  }

  console.log("Inbox seeded successfully!");
  await pool.end();
}

seedInbox().catch(console.error);
