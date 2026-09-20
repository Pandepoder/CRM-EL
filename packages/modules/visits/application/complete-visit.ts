import { Permission, requirePermission, Role, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError, toSafeHttpError } from "@tonala/shared/errors";
import { createEntityId, err, ok } from "@tonala/shared/kernel";
import { LogLevel, measureOperation } from "@tonala/shared/observability";

import { type VisitSummaryView } from "../contracts/index.js";
import { createVisitResult, VisitStatus } from "../domain/index.js";
import { conflictError, forbiddenError, notFoundError } from "./errors.js";
import { type CompleteVisitDependencies, type UseCaseResult } from "./ports.js";

export type CompleteVisitInput = Readonly<{
  visitId: string;
  structuredOutcome: string;
  summary: string;
  /**
   * Ciudadano desde cuya ficha se cierra la visita. Si llega, la visita tiene que ser suya:
   * la ruta web comprueba el acceso al contacto de la dirección, no al de la visita, así que
   * con un contacto propio y el identificador de una visita ajena se cerraba la de otra brigada.
   */
  contactId?: string | undefined;
  /**
   * Personas cuyas visitas puede cerrar quien actúa: su alcance, que la capa web resuelve.
   * Sin ella solo puede cerrar las suyas, que es lo prudente cuando nadie dijo lo contrario.
   */
  scopedUserIds?: readonly string[] | undefined;
}>;

export async function completeVisit(
  actor: ActorContext,
  input: CompleteVisitInput,
  dependencies: CompleteVisitDependencies
): UseCaseResult<VisitSummaryView> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "visits.completeVisit",
    run: async () => {
      const authorization = requirePermission(actor, Permission.VisitsComplete, dependencies.permissionChecker);
      if (!authorization.ok) return err(authorization.error);

      try {
        const visitId = createEntityId(input.visitId);
        const completedAt = dependencies.clock.now();
        const eventId = dependencies.idGenerator.newId();

        const outcome = await dependencies.transactionManager.transaction(async (tx) => {
          const current = await dependencies.visitRepository.findById(visitId, tx);
          if (!current) {
            throw notFoundError("visit_not_found", `Visit ${input.visitId} was not found.`, "Visit was not found.");
          }
          // Se responde "no encontrada" y no "no autorizada": decir que la visita existe pero
          // es de otro ciudadano ya es información del trabajo ajeno.
          if (input.contactId !== undefined && current.contactId !== input.contactId) {
            throw notFoundError(
              "visit_not_found",
              `Visit ${input.visitId} does not belong to contact ${input.contactId}.`,
              "Esta visita no es de este ciudadano."
            );
          }
          if (current.status !== VisitStatus.Scheduled) {
            throw conflictError("visit_already_completed", `Visit ${input.visitId} is already completed.`, "Visit cannot be completed again.");
          }
          if (!canComplete(actor, current.assignedUserId, input.scopedUserIds)) {
            throw forbiddenError("visit_completion_not_authorized", "Actor is not allowed to complete this visit.", "You cannot complete this visit.");
          }

          const result = createVisitResult({
            visitId,
            structuredOutcome: input.structuredOutcome,
            summary: input.summary,
            completedByUserId: actor.actorId,
            completedAt
          });
          const completedVersion = current.version + 1;
          const updated = await dependencies.visitRepository.updateCompleted({
            previousVersion: current.version,
            next: {
              visitId,
              completedAt,
              completedByUserId: actor.actorId,
              version: completedVersion
            }
          }, tx);
          if (!updated) {
            throw conflictError("visit_completion_conflict", `Visit ${input.visitId} changed concurrently.`, "Visit was changed by another operation. Please retry.");
          }
          await dependencies.visitResultRepository.insert(result, tx);
          await dependencies.auditWriter.write({
            actor,
            action: "visits.completed",
            entityType: "visit",
            entityId: visitId,
            beforeData: { status: current.status, version: current.version },
            afterData: {
              status: VisitStatus.Completed,
              outcome: result.structuredOutcome,
              completed_at: completedAt.toISOString(),
              completed_by_user_id: actor.actorId,
              version: completedVersion
            }
          }, tx);
          const completedVisit: VisitSummaryView = {
            ...current,
            status: VisitStatus.Completed,
            completedAt: completedAt.toISOString(),
            completedByUserId: actor.actorId,
            outcome: result.structuredOutcome,
            summary: result.summary,
            version: completedVersion
          };
          await dependencies.outboxWriter.writeVisitCompleted({
            eventId,
            visit: completedVisit,
            result,
            actor,
            occurredAt: completedAt
          }, tx);

          return completedVisit;
        });

        dependencies.logger.log(LogLevel.Info, "Visit completed", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          entityId: outcome.visitId,
          entityType: "visit",
          details: { contactId: outcome.contactId, visitId: outcome.visitId },
          operation: "visits.completeVisit",
          success: true
        });

        return ok(outcome);
      } catch (error) {
        const safe = toSafeHttpError(error);
        dependencies.logger.log(LogLevel.Error, "Visit completion failed", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          entityType: "visit",
          errorCode: safe.code,
          operation: "visits.completeVisit",
          success: false
        });
        return err(error as TonalaOsError);
      }
    }
  });
}

/**
 * Cierra la visita quien la tiene asignada o quien manda sobre esa persona. Antes bastaba con
 * ser coordinador territorial, cualquiera de ellos: uno podía dar por visitado el domicilio de
 * otra brigada, con su resultado y su acta, sin haber estado ahí. Administración se mantiene.
 */
function canComplete(
  actor: ActorContext,
  assignedUserId: string,
  scopedUserIds: readonly string[] | undefined
): boolean {
  return actor.actorId === assignedUserId
    || actor.roles.includes(Role.Admin)
    || (scopedUserIds !== undefined && scopedUserIds.includes(assignedUserId));
}
