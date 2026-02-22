import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deploymentsApi } from '../../api/deployments';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { useAuthStore } from '../../stores/auth-store';
import { PERMISSIONS } from '@idp/shared';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Deployment } from '@idp/shared';

const ACTIVE_STATUSES = ['applying', 'planning', 'destroying', 'rolling_back', 'dispatched', 'running'];

const statusVariant = (status: string) => {
  switch (status) {
    case 'succeeded': return 'success' as const;
    case 'failed': return 'danger' as const;
    case 'applying': case 'planning': case 'destroying': case 'rolling_back': case 'dispatched': case 'running': return 'warning' as const;
    case 'destroyed': return 'default' as const;
    case 'rolled_back': return 'info' as const;
    default: return 'info' as const;
  }
};

export function DeploymentListPage() {
  const { hasPermission, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [cleaningUp, setCleaningUp] = useState(false);
  const [purgingFailed, setPurgingFailed] = useState(false);

  const { data: deployments = [], isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: deploymentsApi.list,
    refetchInterval: 5000,
  });

  const canCleanup = hasPermission(PERMISSIONS.DEPLOYMENTS_DESTROY) && user?.role?.name === 'Admin';
  const failedCount = deployments.filter((d) => d.status === 'failed').length;

  const handleCleanup = async () => {
    if (!confirm('This will permanently delete all deployments in failed, destroyed, rolled back, pending, and planned states. Continue?')) return;
    setCleaningUp(true);
    try {
      const result = await deploymentsApi.cleanupStale();
      toast.success(`Cleaned up ${result.deleted} stale deployment${result.deleted === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Cleanup failed');
    } finally {
      setCleaningUp(false);
    }
  };

  const handlePurgeFailed = async () => {
    if (!confirm(`This will permanently delete all ${failedCount} failed deployment${failedCount === 1 ? '' : 's'}. Continue?`)) return;
    setPurgingFailed(true);
    try {
      const result = await deploymentsApi.purgeFailed();
      toast.success(`Purged ${result.deleted} failed deployment${result.deleted === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Purge failed');
    } finally {
      setPurgingFailed(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this deployment?')) return;
    try {
      await deploymentsApi.delete(id);
      toast.success('Deployment deleted');
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Delete failed');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (d: Deployment) => (
        <Link to={`/deployments/${d.id}`} className="text-primary-600 hover:underline font-medium">
          {d.name}
        </Link>
      ),
    },
    {
      key: 'template',
      header: 'Template',
      render: (d: Deployment) => d.template?.name || '-',
    },
    {
      key: 'cloudConnection',
      header: 'Connection',
      render: (d: Deployment) => d.cloudConnection?.name || '-',
    },
    {
      key: 'execution',
      header: 'Execution',
      render: (d: Deployment) => (
        <Badge variant={d.executionMethod === 'github' ? 'info' : 'default'}>
          {d.executionMethod === 'github' ? 'GitHub' : 'Local'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d: Deployment) => <Badge variant={statusVariant(d.status)}>{d.status}</Badge>,
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (d: Deployment) => d.createdBy?.displayName || '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (d: Deployment) => new Date(d.createdAt).toLocaleString(),
    },
    ...(canCleanup
      ? [
          {
            key: 'actions',
            header: '',
            render: (d: Deployment) =>
              !ACTIVE_STATUSES.includes(d.status) ? (
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete deployment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : null,
          },
        ]
      : []),
  ];

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deployments</h1>
        {canCleanup && (
          <div className="flex items-center gap-2">
            {failedCount > 0 && (
              <Button variant="danger" onClick={handlePurgeFailed} loading={purgingFailed}>
                <Trash2 className="w-4 h-4 mr-2" /> Purge Failed ({failedCount})
              </Button>
            )}
            <Button variant="danger" onClick={handleCleanup} loading={cleaningUp}>
              <Trash2 className="w-4 h-4 mr-2" /> Clean Up
            </Button>
          </div>
        )}
      </div>
      <Card>
        <Table columns={columns} data={deployments} emptyMessage="No deployments yet" />
      </Card>
    </div>
  );
}
