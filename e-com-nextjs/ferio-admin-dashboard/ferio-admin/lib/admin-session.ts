export type AdminSession = {
  userId: string;
  email: string;
  role: "admin" | "staff";
  permissions: string[];
};

export function sessionCan(session: AdminSession, permission: string): boolean {
  return session.role === "admin" || session.permissions.includes(permission);
}
