import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api/audit';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { AuditLogEntry } from '@idp/shared';

const columns = [
  {
    key: 'createdAt',
    header: 'Time',
    render: (entry: AuditLogEntry) => (
      <span className="text-gray-500 dark:text-gray-400">{new Date(entry.createdAt).toLocaleString()}</span>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    render: (entry: AuditLogEntry) => <Badge>{entry.action}</Badge>,
  },
  {
    key: 'resource',
    header: 'Resource',
    render: (entry: AuditLogEntry) => (
      <>
        {entry.resource}
        {entry.resourceId ? ` (${entry.resourceId.slice(0, 8)}...)` : ''}
      </>
    ),
  },
  {
    key: 'user',
    header: 'User',
    render: (entry: AuditLogEntry) => entry.user?.displayName || '-',
  },
  {
    key: 'ipAddress',
    header: 'IP',
    render: (entry: AuditLogEntry) => (
      <span className="text-gray-500 dark:text-gray-400">{entry.ipAddress || '-'}</span>
    ),
  },
];

export function AuditLogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', page],
    queryFn: () => auditApi.list({ page, limit: 50 }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : !data?.data.length ? (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">No audit entries</p>
        ) : (
          <>
            <Table<AuditLogEntry> columns={columns} data={data.data} />
            <div className="flex justify-between items-center pt-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total: {data.total}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
