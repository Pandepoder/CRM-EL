import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type SectionStatsDto } from "../contracts/index.js";
import { type GetSectionStatsDependencies, type UseCaseResult } from "./ports.js";

export type GetSectionStatsInput = Readonly<{
  sectionNum: number;
}>;

export async function getSectionStats(
  actor: ActorContext,
  input: GetSectionStatsInput,
  dependencies: GetSectionStatsDependencies
): UseCaseResult<SectionStatsDto> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "territory.getSectionStats",
    run: async () => {
      const authorization = requirePermission(
        actor,
        Permission.ContactsRead,
        dependencies.permissionChecker
      );
      if (!authorization.ok) {
        return err(authorization.error);
      }

      try {
        const stats = await dependencies.territoryReader.getSectionStats(input.sectionNum);
        if (!stats) {
          // Si la sección existe pero no tiene datos operativos o no existe,
          // retornamos zeros para mantener la compatibilidad con el mapa.
          return ok({
            sectionNum: input.sectionNum,
            contactCount: 0,
            visitScheduledCount: 0,
            visitCompletedCount: 0,
            colonies: []
          });
        }
        return ok(stats);
      } catch (error) {
        return err(error as TonalaOsError);
      }
    }
  });
}
