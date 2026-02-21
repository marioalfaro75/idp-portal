import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../../api/services';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { useAuthStore } from '../../stores/auth-store';
import { PERMISSIONS } from '@idp/shared';
import type { WorkflowRun } from '@idp/shared';
import { ArrowLeft, ExternalLink, Play, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';

const statusVariant = (status: string) => {
  switch (status) {
    case 'active': case 'completed': case 'success': return 'success' as const;
    case 'failed': return 'danger' as const;
    case 'scaffolding': case 'in_progress': case 'queued': case 'pending': return 'warning' as const;
    case 'archived': return 'default' as const;
    default: return 'info' as const;
  }
};

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [triggering, setTriggering] = useState(false);

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => servicesApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data;
      if (!s) return false;
      if (s.status === 'scaffolding') return 2000;
      if (s.workflowRuns?.some((r) => ['pending', 'queued', 'in_progress'].includes(r.status))) return 3000;
      return false;
    },
  });

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await servicesApi.triggerWorkflow(id!);
      toast.success('Workflow triggered!');
      queryClient.invalidateQueries({ queryKey: ['service', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Trigger failed');
    } finally {
      setTriggering(false);
    }
  };

  const handleRetry = async (runId: string) => {
    try {
      await servicesApi.retryWorkflow(id!, runId);
      toast.success('Workflow retried!');
      queryClient.invalidateQueries({ queryKey: ['service', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Retry failed');
    }
  };

  if (isLoading || !service) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  const runColumns = [
    {
      key: 'workflowName',
      header: 'Workflow',
      render: (r: WorkflowRun) => r.workflowName || '-',
    },
    {
      key: 'triggerType',
      header: 'Trigger',
      render: (r: WorkflowRun) => <Badge variant="default">{r.triggerType}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: WorkflowRun) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
    },
    {
      key: 'github',
      header: 'GitHub',
      render: (r: WorkflowRun) =>
        r.githubRunUrl ? (
          <a href={r.githubRunUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline inline-flex items-center gap-1 text-sm">
            View <ExternalLink className="w-3 h-3" />
          </a>
        ) : '-',
    },
    {
      key: 'triggeredBy',
      header: 'Triggered By',
      render: (r: WorkflowRun) => r.triggeredBy?.displayName || '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (r: WorkflowRun) => new Date(r.createdAt).toLocaleString(),
    },
    ...(hasPermission(PERMISSIONS.SERVICES_MANAGE) ? [{
      key: 'actions',
      header: '',
      render: (r: WorkflowRun) =>
        r.status === 'failed' ? (
          <Button size="sm" variant="secondary" onClick={() => handleRetry(r.id)}>
            <RotateCcw className="w-3 h-3 mr-1" /> Retry
          </Button>
        ) : null,
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/services" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{service.name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={statusVariant(service.status)}>{service.status}</Badge>
          </div>
        </div>
        {hasPermission(PERMISSIONS.SERVICES_MANAGE) && service.githubRepoSlug && service.status !== 'scaffolding' && (
          <Button onClick={handleTrigger} loading={triggering}>
            <Play className="w-4 h-4 mr-2" /> Run Workflow
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Details">
          <dl className="space-y-3">
            <div><dt className="text-sm text-gray-500 dark:text-gray-400">Template</dt><dd className="font-medium">{service.template?.name}</dd></div>
            {service.githubRepoUrl && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">GitHub Repository</dt>
                <dd>
                  <a href={service.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium inline-flex items-center gap-1">
                    {service.githubRepoSlug} <ExternalLink className="w-3 h-3" />
                  </a>
                </dd>
              </div>
            )}
            <div><dt className="text-sm text-gray-500 dark:text-gray-400">Created By</dt><dd className="font-medium">{service.createdBy?.displayName}</dd></div>
            <div><dt className="text-sm text-gray-500 dark:text-gray-400">Created At</dt><dd className="font-medium">{new Date(service.createdAt).toLocaleString()}</dd></div>
          </dl>
        </Card>

        {Object.keys(service.parameters).length > 0 && (
          <Card title="Parameters">
            <dl className="space-y-2">
              {Object.entries(service.parameters).map(([key, value]) => (
                <div key={key} className="flex gap-4">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 w-48">{key}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>

      {service.errorMessage && (
        <Card title="Error">
          <pre className="text-red-600 dark:text-red-400 text-sm whitespace-pre-wrap">{service.errorMessage}</pre>
        </Card>
      )}

      <Card title="Workflow Runs">
        <Table columns={runColumns} data={service.workflowRuns || []} emptyMessage="No workflow runs yet" />
      </Card>
    </div>
  );
}
