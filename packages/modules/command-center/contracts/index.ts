export const commandCenterContractsName = "command-center-contracts";

export type WalkingSkeletonProjectionSnapshot = Readonly<{
  projectionKey: "global";
  contactRegisteredCount: number;
  contactLinkedCount: number;
  responsibleAssignedCount: number;
  visitScheduledCount: number;
  visitCompletedCount: number;
  lastEventAt: string | null;
  version: number;
}>;
