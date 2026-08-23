import { Permission, requirePermission, Role, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError, toSafeHttpError } from "@tonala/shared/errors";
import { createEntityId, err, ok } from "@tonala/shared/kernel";
import { LogLevel, measureOperation } from "@tonala/shared/observability";

import { type AssignResponsibleResult } from "../contracts/index.js";
import { createInitialContactAssignment, reassignContact } from "../domain/index.js";
import { conflictError, notFoundError, validationError } from "./errors.js";
import { type AssignResponsibleDependencies, type UseCaseResult, type UserDirectoryView } from "./ports.js";

export type AssignResponsibleInput = Readonly<{
  contactId: string;
  assignedUserId: string;
}>;

const operationalRoles = new Set<string>([Role.Admin, Role.TerritorialCoordinator, Role.VisitResponsible]);
const operationalPermissions = new Set(["visits:schedule", "visits:complete", "assignments:create"]);

export async function assignResponsible(
  actor: ActorContext,
  input: AssignResponsibleInput,
  dependencies: AssignResponsibleDependencies
): UseCaseResult<AssignResponsibleResult> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "assignments.assignResponsible",
    run: async () => {
      const authorization = requirePermission(actor, Permission.AssignmentsCreate, dependencies.permissionChecker);
      if (!authorization.ok) {
        return err(authorization.error);
      }

      try {
        const contactId = createEntityId(input.contactId);
        const assignedUserId = createEntityId(input.assignedUserId);

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

        const user = await dependencies.userDirectoryReader.getUserCapability(assignedUserId);
        if (!user) {
          return err(notFoundError("responsible_user_not_found", `User ${input.assignedUserId} was not found.`, "Responsible user was not found."));
        }
        if (!user.active) {
          return err(validationError("responsible_user_inactive", `User ${input.assignedUserId} is inactive.`, "Responsible user is inactive."));
        }
        if (!hasOperationalCapability(user)) {
          return err(validationError("responsible_user_not_operational", `User ${input.assignedUserId} lacks operational capability.`, "Responsible user is not eligible for assignment."));
        }

        const assignedAt = dependencies.clock.now();
        const eventId = dependencies.idGenerator.newId();
        const outcome = await dependencies.transactionManager.transaction(async (tx) => {
          const current = await dependencies.contactAssignmentRepository.findByContactId(contactId, tx);
          if (current?.assignedUserId === assignedUserId) {
            return {
              contactAssignment: current,
              changed: false,
              idempotent: true
            } satisfies AssignResponsibleResult;
          }

          const next = current
            ? reassignContact({
              contactId,
              assignedUserId: current.assignedUserId,
              assignmentStatus: current.assignmentStatus,
              assignedByUserId: actor.actorId,
              assignedAt: new Date(current.assignedAt),
              version: current.version
            }, { assignedUserId, assignedByUserId: actor.actorId, assignedAt })
            : createInitialContactAssignment({ contactId, assignedUserId, assignedByUserId: actor.actorId, assignedAt });

          if (current) {
            const updated = await dependencies.contactAssignmentRepository.updateExisting({
              previousVersion: current.version,
              next
            }, tx);
            if (!updated) {
              throw conflictError(
                "contact_assignment_version_conflict",
                `Contact assignment ${contactId} was changed concurrently.`,
                "Assignment was changed by another operation. Please retry."
              );
            }
          } else {
            await dependencies.contactAssignmentRepository.insertInitial(next, tx);
          }

          await dependencies.auditWriter.write({
            actor,
            action: "assignments.responsible_assigned",
            entityType: "contact_assignment",
            entityId: contactId,
            beforeData: current
              ? {
                previous_assigned_user_id: current.assignedUserId,
                previous_status: current.assignmentStatus,
                previous_version: current.version
              }
              : null,
            afterData: {
              assigned_user_id: next.assignedUserId,
              assignment_status: next.assignmentStatus,
              version: next.version
            }
          }, tx);

          await dependencies.outboxWriter.writeResponsibleAssigned({
            eventId,
            assignment: next,
            actor,
            occurredAt: assignedAt
          }, tx);

          return {
            contactAssignment: {
              contactId: next.contactId,
              assignedUserId: next.assignedUserId,
              assignmentStatus: next.assignmentStatus,
              assignedAt: next.assignedAt.toISOString(),
              version: next.version
            },
            changed: true,
            idempotent: false
          } satisfies AssignResponsibleResult;
        });

        dependencies.logger.log(LogLevel.Info, "Responsible assigned", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          entityId: contactId,
          entityType: "contact_assignment",
          details: { contactId, assignedUserId },
          operation: "assignments.assignResponsible",
          success: true
        });

        return ok(outcome);
      } catch (error) {
        const safe = toSafeHttpError(error);
        dependencies.logger.log(LogLevel.Error, "Responsible assignment failed", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          entityType: "contact_assignment",
          errorCode: safe.code,
          operation: "assignments.assignResponsible",
          success: false
        });
        return err(error as TonalaOsError);
      }
    }
  });
}

function hasOperationalCapability(user: UserDirectoryView): boolean {
  return user.roles.some((role) => operationalRoles.has(role))
    || user.permissions.some((permission) => operationalPermissions.has(permission));
}
