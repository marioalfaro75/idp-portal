import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api/audit';
import { usersApi } from '../../api/users';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
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

const actionOptions = [
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'setup', label: 'Setup' },
  { value: 'change_password', label: 'Change Password' },
  { value: 'federation_login', label: 'Federation Login' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'set_groups', label: 'Set Groups' },
  { value: 'set_members', label: 'Set Members' },
  { value: 'set_templates', label: 'Set Templates' },
  { value: 'sync', label: 'Sync' },
  { value: 'update_tags', label: 'Update Tags' },
  { value: 'destroy', label: 'Destroy' },
  { value: 'rollback', label: 'Rollback' },
  { value: 'cleanup_stale', label: 'Cleanup Stale' },
  { value: 'purge_failed', label: 'Purge Failed' },
  { value: 'dispatch_workflow', label: 'Dispatch Workflow' },
  { value: 'trigger_workflow', label: 'Trigger Workflow' },
  { value: 'retry_workflow', label: 'Retry Workflow' },
  { value: 'configure', label: 'Configure' },
  { value: 'remove', label: 'Remove' },
  { value: 'federation_provider_create', label: 'Federation Provider Create' },
  { value: 'federation_provider_update', label: 'Federation Provider Update' },
  { value: 'federation_provider_delete', label: 'Federation Provider Delete' },
  { value: 'terraform_install', label: 'Terraform Install' },
  { value: 'terraform_path', label: 'Terraform Path' },
];

const resourceOptions = [
  { value: 'auth', label: 'Auth' },
  { value: 'user', label: 'User' },
  { value: 'role', label: 'Role' },
  { value: 'group', label: 'Group' },
  { value: 'cloud_connection', label: 'Cloud Connection' },
  { value: 'template', label: 'Template' },
  { value: 'templates', label: 'Templates' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'service', label: 'Service' },
  { value: 'federation', label: 'Federation' },
  { value: 'github', label: 'GitHub' },
  { value: 'github_app', label: 'GitHub App' },
  { value: 'settings', label: 'Settings' },
];

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const { data: usersList = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', page, actionFilter, resourceFilter, userFilter],
    queryFn: () => auditApi.list({
      page,
      limit: 50,
      ...(actionFilter && { action: actionFilter }),
      ...(resourceFilter && { resource: resourceFilter }),
      ...(userFilter && { userId: userFilter }),
    }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <Select options={actionOptions} value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="w-48" />
          <Select options={resourceOptions} value={resourceFilter} onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }} className="w-48" />
          <Select options={usersList.map((u) => ({ value: u.id, label: u.displayName }))} value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }} className="w-48" />
        </div>
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
