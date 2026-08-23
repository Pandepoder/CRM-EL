import "dotenv/config";

import { loadAppEnv } from "../../packages/config/index.js";
import { createDatabaseClient, createPgPool, closePgPool } from "../../packages/shared/database/index.js";
import { createOutboxWorkerComposition } from "../../packages/shared/outbox/index.js";
import { registerProjectionEngineConsumer } from "../composition/projection-engine.js";

const env = loadAppEnv();
const pool = createPgPool(env.private.DATABASE_URL);

try {
  const db = createDatabaseClient(pool);
  const composition = createOutboxWorkerComposition({ db });
  registerProjectionEngineConsumer({
    db,
    logger: composition.logger,
    registry: composition.registry
  });
  const summary = await composition.worker.runOnce({
    workerId: composition.workerId,
    batchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? 50),
    abandonedTimeoutSeconds: Number(process.env.OUTBOX_ABANDONED_TIMEOUT_SECONDS ?? 300)
  });
  console.warn(JSON.stringify(summary));
} finally {
  await closePgPool(pool);
}
