import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError, toSafeHttpError } from "@tonala/shared/errors";
import { createEntityId, err, ok } from "@tonala/shared/kernel";
import { LogLevel, measureOperation } from "@tonala/shared/observability";

import { type VisitSummaryView } from "../contracts/index.js";
import { createVisit } from "../domain/index.js";
import { notFoundError, validationError } from "./errors.js";
import { type ScheduleVisitDependencies, type UseCaseResult } from "./ports.js";

export type ScheduleVisitInput = Readonly<{
  contactId: string;
  scheduledAt: string;
  visitLocationText: string;
}>;

export async function scheduleVisit(
  actor: ActorContext,
  input: ScheduleVisitInput,
  dependencies: ScheduleVisitDependencies
): UseCaseResult<VisitSummaryView> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "visits.scheduleVisit",
    run: async () => {
      const authorization = requirePermission(actor, Permission.VisitsSchedule, dependencies.permissionChecker);
      if (!authorization.ok) return err(authorization.error);

      try {
        const now = dependencies.clock.now();
        const contactId = createEntityId(input.contactId);
        const scheduledAt = new Date(input.scheduledAt);
        if (Number.isNaN(scheduledAt.getTime())) {
          return err(validationError("visit_scheduled_at_invalid", "scheduledAt is not a valid date.", "Scheduled date is invalid."));
        }
        if (scheduledAt.getTime() < now.getTime()) {
          return err(validationError("visit_scheduled_at_in_past", "scheduledAt cannot be in the past.", "Scheduled date cannot be in the past."));
        }

        const contact = await dependencies.contactsReader.getContactStatus(contactId);
        if (!contact || contact.status !== "active") {
          return err(notFoundError("contact_not_found", `Contact ${input.contactId} was not found or inactive.`, "Contact was not found."));
        }
        const territory = await dependencies.territoryReader.getContactTerritory(contactId);
        if (!territory) {
          return err(notFoundError("contact_territory_not_found", `Contact ${input.contactId} has no territory.`, "Contact territory was not found."));
        }
        if (territory.territoryStatus !== "confirmed") {
          return err(validationError("contact_territory_not_confirmed", `Contact ${input.contactId} territory is not confirmed.`, "Contact territory is not confirmed."));
        }
        const assignment = await dependencies.assignmentsReader.getContactAssignment(contactId);
        if (!assignment) {
          return err(notFoundError("contact_assignment_not_found", `Contact ${input.contactId} has no assignment.`, "Contact assignment was not found."));
        }
        if (assignment.assignmentStatus !== "active") {
          return err(validationError("contact_assignment_not_active", `Contact ${input.contactId} assignment is not active.`, "Contact assignment is not active."));
        }

        const visit = createVisit({
          visitId: dependencies.idGenerator.newId(),
          contactId,
          colonyId: territory.colonyId,
          assignedUserId: assignment.assignedUserId,
          scheduledAt,
          visitLocationText: input.visitLocationText,
          createdByUserId: actor.actorId,
          createdAt: now
        });
        const eventId = dependencies.idGenerator.newId();

        await dependencies.transactionManager.transaction(async (tx) => {
          await dependencies.visitRepository.insert(visit, tx);
          await dependencies.auditWriter.write({
            actor,
            action: "visits.scheduled",
            entityType: "visit",
            entityId: visit.visitId,
            beforeData: null,
            afterData: {
              visit_id: visit.visitId,
              contact_id: visit.contactId,
              colony_id: visit.colonyId,
              assigned_user_id: visit.assignedUserId,
              scheduled_at: visit.scheduledAt.toISOString(),
              status: visit.status,
              version: visit.version
            }
          }, tx);
          await dependencies.outboxWriter.writeVisitScheduled({ eventId, visit, actor, occurredAt: now }, tx);
        });

        dependencies.logger.log(LogLevel.Info, "Visit scheduled", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          entityId: visit.visitId,
          entityType: "visit",
          details: { contactId: visit.contactId, visitId: visit.visitId },
          operation: "visits.scheduleVisit",
          success: true
        });

        return ok(toSummary(visit));
      } catch (error) {
        const safe = toSafeHttpError(error);
        dependencies.logger.log(LogLevel.Error, "Visit scheduling failed", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          entityType: "visit",
          errorCode: safe.code,
          operation: "visits.scheduleVisit",
          success: false
        });
        return err(error as TonalaOsError);
      }
    }
  });
}

function toSummary(visit: ReturnType<typeof createVisit>): VisitSummaryView {
  return {
    visitId: visit.visitId,
    contactId: visit.contactId,
    colonyId: visit.colonyId,
    assignedUserId: visit.assignedUserId,
    scheduledAt: visit.scheduledAt.toISOString(),
    status: visit.status,
    visitLocationText: visit.visitLocationText,
    createdAt: visit.createdAt.toISOString(),
    completedAt: null,
    completedByUserId: null,
    outcome: null,
    summary: null,
    version: visit.version
  };
}
