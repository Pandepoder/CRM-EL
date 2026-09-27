export type UserSummary = Readonly<{
  userId: string;
  email: string;
  displayName: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  status: string;
  /** El administrador maestro (0023): administración sin frontera de municipio. */
  isMasterAdmin: boolean;
  /** Versión de la sesión (0023): una sesión abierta con otra deja de valer. */
  sessionVersion: number;
  createdAt: string;
}>;

export interface UsersReader {
  listUsers(): Promise<UserSummary[]>;
  getUserById(userId: string): Promise<UserSummary | null>;
}
