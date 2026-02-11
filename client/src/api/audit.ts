import api from './client';
import type { AuditLogEntry, AuditLogQuery } from '@idp/shared';

export const auditApi = {
  list: (query?: AuditLogQuery) =>
    api.get<{ data: AuditLogEntry[]; total: number; page: number; limit: number }>('/audit-logs', { params: query }).then((r) => r.data),
};
