import "dotenv/config";

import { loadAppEnv } from "../../packages/config/index.js";
import { seedDatabase } from "./seeds.js";

const env = loadAppEnv();
const result = await seedDatabase(env.private.DATABASE_URL);

console.warn(`Seed complete: roles=${result.roles}, users=${result.users}, colonies=${result.colonies}`);
