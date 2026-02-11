export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  userId: string | null;
  user?: { id: string; displayName: string; email: string } | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogQuery {
  action?: string;
  resource?: string;
  userId?: string;
  page?: number;
  limit?: number;
}
