import "dotenv/config";
import pg from "pg";
import { loadAppEnv } from "../../packages/config/index.js";
import crypto from "node:crypto";

async function seedLogistics() {
  const env = loadAppEnv();
  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

  console.log("Seeding warehouses...");
  const wId = crypto.randomUUID();
  await pool.query(`INSERT INTO warehouses (id, name, location) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [wId, "Bodega Central Tonalá", "Centro"]);

  // Get a user for performedBy
  const userRes = await pool.query("SELECT id FROM user_profiles LIMIT 1");
  const userId = userRes.rows[0]?.id;

  if (userId) {
    console.log("Seeding inventory items...");
    const items = [
      { sku: "CAM-01", name: "Playera Blanca Logo Tonalá", category: "ropa", qty: 5000 },
      { sku: "GOR-02", name: "Gorra Azul Unitalla", category: "ropa", qty: 2500 },
      { sku: "LON-10", name: "Lona 2x1m", category: "propaganda", qty: 1000 },
      { sku: "FOL-50", name: "Folleto Propuestas v1", category: "impresos", qty: 25000 },
    ];

    for (const it of items) {
      const itemId = crypto.randomUUID();
      await pool.query(`INSERT INTO inventory_items (id, warehouse_id, sku, name, category, quantity) VALUES ($1, $2, $3, $4, $5, $6)`, 
        [itemId, wId, it.sku, it.name, it.category, it.qty]);

      await pool.query(`INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, performed_by_user_id) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), itemId, "in", it.qty, userId]);
      
      // Add a fake outgoing tx
      await pool.query(`INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, performed_by_user_id, notes) VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), itemId, "out", 50, userId, "Asignado a Brigada Norte"]);
    }
  }

  await pool.end();
  console.log("Logistics seed complete!");
}

seedLogistics();
