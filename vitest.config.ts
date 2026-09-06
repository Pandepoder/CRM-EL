import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@tonala/modules/contacts/application": fileURLToPath(new URL("./packages/modules/contacts/application/index.ts", import.meta.url)),
      "@tonala/modules/contacts/contracts": fileURLToPath(new URL("./packages/modules/contacts/contracts/index.ts", import.meta.url)),
      "@tonala/modules/contacts/domain": fileURLToPath(new URL("./packages/modules/contacts/domain/index.ts", import.meta.url)),
      "@tonala/modules/contacts/infrastructure": fileURLToPath(new URL("./packages/modules/contacts/infrastructure/index.ts", import.meta.url)),
      "@tonala/modules/assignments/application": fileURLToPath(new URL("./packages/modules/assignments/application/index.ts", import.meta.url)),
      "@tonala/modules/assignments/contracts": fileURLToPath(new URL("./packages/modules/assignments/contracts/index.ts", import.meta.url)),
      "@tonala/modules/assignments/domain": fileURLToPath(new URL("./packages/modules/assignments/domain/index.ts", import.meta.url)),
      "@tonala/modules/assignments/infrastructure": fileURLToPath(new URL("./packages/modules/assignments/infrastructure/index.ts", import.meta.url)),
      "@tonala/modules/territory/application": fileURLToPath(new URL("./packages/modules/territory/application/index.ts", import.meta.url)),
      "@tonala/modules/territory/contracts": fileURLToPath(new URL("./packages/modules/territory/contracts/index.ts", import.meta.url)),
      "@tonala/modules/territory/domain": fileURLToPath(new URL("./packages/modules/territory/domain/index.ts", import.meta.url)),
      "@tonala/modules/territory/infrastructure": fileURLToPath(new URL("./packages/modules/territory/infrastructure/index.ts", import.meta.url)),
      "@tonala/modules/visits/application": fileURLToPath(new URL("./packages/modules/visits/application/index.ts", import.meta.url)),
      "@tonala/modules/visits/contracts": fileURLToPath(new URL("./packages/modules/visits/contracts/index.ts", import.meta.url)),
      "@tonala/modules/visits/domain": fileURLToPath(new URL("./packages/modules/visits/domain/index.ts", import.meta.url)),
      "@tonala/modules/visits/infrastructure": fileURLToPath(new URL("./packages/modules/visits/infrastructure/index.ts", import.meta.url)),
      "@tonala/modules/command-center/application": fileURLToPath(new URL("./packages/modules/command-center/application/index.ts", import.meta.url)),
      "@tonala/modules/command-center/contracts": fileURLToPath(new URL("./packages/modules/command-center/contracts/index.ts", import.meta.url)),
      "@tonala/modules/command-center/infrastructure": fileURLToPath(new URL("./packages/modules/command-center/infrastructure/index.ts", import.meta.url)),
      "@tonala/modules/governance/application": fileURLToPath(new URL("./packages/modules/governance/application/index.ts", import.meta.url)),
      "@tonala/modules/governance/contracts": fileURLToPath(new URL("./packages/modules/governance/contracts/index.ts", import.meta.url)),
      "@tonala/modules/governance/domain": fileURLToPath(new URL("./packages/modules/governance/domain/index.ts", import.meta.url)),
      "@tonala/modules/governance/infrastructure": fileURLToPath(new URL("./packages/modules/governance/infrastructure/index.ts", import.meta.url)),
      "@tonala/modules/inbox/application": fileURLToPath(new URL("./packages/modules/inbox/application/index.ts", import.meta.url)),
      "@tonala/modules/inbox/contracts": fileURLToPath(new URL("./packages/modules/inbox/contracts/index.ts", import.meta.url)),
      "@tonala/modules/inbox/infrastructure": fileURLToPath(new URL("./packages/modules/inbox/infrastructure/index.ts", import.meta.url)),
      "@tonala/modules/logistics/application": fileURLToPath(new URL("./packages/modules/logistics/application/index.ts", import.meta.url)),
      "@tonala/modules/logistics/contracts": fileURLToPath(new URL("./packages/modules/logistics/contracts/index.ts", import.meta.url)),
      "@tonala/modules/logistics/infrastructure": fileURLToPath(new URL("./packages/modules/logistics/infrastructure/index.ts", import.meta.url)),
      "@tonala/modules/routes/application": fileURLToPath(new URL("./packages/modules/routes/application/index.ts", import.meta.url)),
      "@tonala/modules/routes/contracts": fileURLToPath(new URL("./packages/modules/routes/contracts/index.ts", import.meta.url)),
      "@tonala/modules/routes/domain": fileURLToPath(new URL("./packages/modules/routes/domain/index.ts", import.meta.url)),
      "@tonala/modules/routes/infrastructure": fileURLToPath(new URL("./packages/modules/routes/infrastructure/index.ts", import.meta.url)),
      "@tonala/shared/kernel": fileURLToPath(new URL("./packages/shared/kernel/index.ts", import.meta.url)),
      "@tonala/shared/auth": fileURLToPath(new URL("./packages/shared/auth/index.ts", import.meta.url)),
      "@tonala/shared/database": fileURLToPath(new URL("./packages/shared/database/index.ts", import.meta.url)),
      "@tonala/shared/errors": fileURLToPath(new URL("./packages/shared/errors/index.ts", import.meta.url)),
      "@tonala/shared/observability": fileURLToPath(new URL("./packages/shared/observability/index.ts", import.meta.url)),
      // Antes que el alias corto: Vite reescribe por prefijo, y sin esta linea
      // "@tonala/shared/outbox/infrastructure" acababa apuntando dentro de
      // index.ts. Es lo que hacia fallar el outbox inline en cada prueba.
      "@tonala/shared/outbox/infrastructure": fileURLToPath(new URL("./packages/shared/outbox/infrastructure/index.ts", import.meta.url)),
      "@tonala/shared/outbox": fileURLToPath(new URL("./packages/shared/outbox/index.ts", import.meta.url)),
      "@tonala/shared/projections/infrastructure": fileURLToPath(new URL("./packages/shared/projections/infrastructure/index.ts", import.meta.url)),
      "@tonala/shared/projections": fileURLToPath(new URL("./packages/shared/projections/public.ts", import.meta.url)),
      "@tonala/ui": fileURLToPath(new URL("./packages/ui/index.ts", import.meta.url)),
      "@tonala/config": fileURLToPath(new URL("./packages/config/index.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url))
    }
  }
});
