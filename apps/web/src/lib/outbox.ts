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
    // Importamos dinámicamente para no ensuciar el grafo de dependencias estático
    // (igual que hacemos con los repositorios en crm-deps.ts)
    const { createOutboxWorkerComposition } = await import("@tonala/shared/outbox/infrastructure");
    
    const { worker, workerId } = createOutboxWorkerComposition({ db, logger });
    
    // Ejecutamos 1 lote (batch) inline
    await worker.runOnce({
      workerId,
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
