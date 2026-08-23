export type OperationalSummary = Readonly<{
  totalContacts: number;
  totalUsers: number;
  visitsScheduled: number;
  visitsCompleted: number;
}>;

export interface OperationalSummaryReader {
  getSummary(): Promise<OperationalSummary>;
};
