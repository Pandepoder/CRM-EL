export type UserSummary = Readonly<{
  userId: string;
  email: string;
  displayName: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  status: string;
  createdAt: string;
}>;

export interface UsersReader {
  listUsers(): Promise<UserSummary[]>;
  getUserById(userId: string): Promise<UserSummary | null>;
}
