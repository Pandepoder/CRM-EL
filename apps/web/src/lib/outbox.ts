import { type Database } from "@tonala/shared/database";
import { DevelopmentLogger } from "@tonala/shared/observability";

/**
 * Procesa el outbox transaccional de forma inline.
 * En V1 esto reemplaza a un worker background real (cron/daemon).
 * Se debe invocar al final de cada route handler que realice mutaciones.
 */
export async function processOutboxInline(db: Database): Promise<void> {
  const logger = new DevelopmentLogger();
  
  try {
    const { createOutboxWorkerComposition } = await import("@tonala/shared/outbox/infrastructure");
    const { registerProjectionEngineConsumer } = await import("../../../../scripts/composition/projection-engine.js");
    
    const composition = createOutboxWorkerComposition({ db, logger });
    
    // Conectamos el motor de proyecciones para que los dashboards (Command Center) se actualicen inmediatamente
    registerProjectionEngineConsumer({
      db,
      logger,
      registry: composition.registry
    });
    
    // Ejecutamos 1 lote (batch) inline
    await composition.worker.runOnce({
      workerId: composition.workerId,
      batchSize: 50,
      abandonedTimeoutSeconds: 300
    });
  } catch (error) {
    // Es crítico no fallar el request HTTP si el outbox falla.
    // El outbox está diseñado para reintentar después.
    logger.log("error", "Failed to process outbox inline", {
      operation: "processOutboxInline",
      errorCode: error instanceof Error ? error.name : "unknown_error"
    });
  }
}
