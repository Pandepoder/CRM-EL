-- Logística usable (plan de auditoría de menús, fase 5, D7).
--
-- - `min_quantity` (D7): el mínimo de un artículo; con las existencias en o por debajo, «Por agotarse».
-- - `archived_at`: archivar un artículo lo quita de la lista sin borrarlo; archivado no acepta movimientos.
-- - `updated_at`: cuándo se editó por última vez.
-- - `devolucion`: un nuevo tipo de movimiento, para lo que una persona regresa al almacén. La columna no tenía
--   regla: ahora acepta solo 'in', 'out' y 'devolucion'.
-- - Índice por fecha del historial: «Entregas en los últimos 30 días» y el historial por páginas.
--
-- COMPATIBLE CON LA VERSIÓN ANTERIOR DE LA APLICACIÓN: solo agrega columnas, un índice y reglas NOT VALID (valen
-- para lo nuevo, sin revisar lo que ya existe), dentro de un bloque DO que mira pg_constraint para poder
-- correrla dos veces. La versión anterior no escribe `devolucion` ni mínimos. Escrita a mano.

ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "min_quantity" integer;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS "inventory_transactions_created_at_idx" ON "inventory_transactions" ("created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_min_quantity_check') THEN
    ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_min_quantity_check"
      CHECK ("min_quantity" IS NULL OR "min_quantity" >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_transactions_type_check') THEN
    ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_type_check"
      CHECK ("transaction_type" IN ('in', 'out', 'devolucion')) NOT VALID;
  END IF;
END $$;
