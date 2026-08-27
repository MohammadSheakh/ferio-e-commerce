export type AuditSource = "ADMIN_API" | "SYSTEM" | "JOB" | "PROVIDER";

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  actorRole: string | null;
  source: AuditSource;
  previousValue: unknown;
  newValue: unknown;
  metadata: unknown;
  createdAt: string;
};

export type AuditLogPage = {
  items: AuditLog[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
