import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deploymentsApi } from '../../api/deployments';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/auth-store';
import { PERMISSIONS } from '@idp/shared';
import { ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const statusVariant = (status: string) => {
  switch (status) {
    case 'succeeded': return 'success' as const;
    case 'failed': return 'danger' as const;
    case 'applying': case 'planning': case 'destroying': return 'warning' as const;
    default: return 'info' as const;
  }
};

export function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<string[]>([]);
  const [destroying, setDestroying] = useState(false);

  const { data: deployment, isLoading } = useQuery({
    queryKey: ['deployment', id],
    queryFn: () => deploymentsApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      return d && ['pending', 'planning', 'applying', 'destroying'].includes(d.status) ? 2000 : false;
    },
  });

  useEffect(() => {
    if (!id || !deployment) return;
    if (!['planning', 'applying', 'destroying'].includes(deployment.status)) return;

    const es = deploymentsApi.getLogs(id);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLogs((prev) => [...prev, data.message]);
        if (data.type === 'complete') {
          queryClient.invalidateQueries({ queryKey: ['deployment', id] });
          es.close();
        }
      } catch {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [id, deployment?.status]);

  const handleDestroy = async () => {
    if (!confirm('Are you sure you want to destroy this deployment?')) return;
    setDestroying(true);
    try {
      await deploymentsApi.destroy(id!);
      toast.success('Destroy initiated');
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Destroy failed');
    } finally {
      setDestroying(false);
    }
  };

  if (isLoading || !deployment) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  const canDestroy = deployment.status === 'succeeded' &&
    hasPermission(PERMISSIONS.DEPLOYMENTS_DESTROY) &&
    (user?.role?.name === 'Admin' || deployment.createdById === user?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/deployments" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{deployment.name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={statusVariant(deployment.status)}>{deployment.status}</Badge>
          </div>
        </div>
        {canDestroy && (
          <Button variant="danger" onClick={handleDestroy} loading={destroying}>
            <Trash2 className="w-4 h-4 mr-2" /> Destroy
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Details">
          <dl className="space-y-3">
            <div><dt className="text-sm text-gray-500">Template</dt><dd className="font-medium">{deployment.template?.name}</dd></div>
            <div><dt className="text-sm text-gray-500">Cloud Connection</dt><dd className="font-medium">{deployment.cloudConnection?.name}</dd></div>
            <div><dt className="text-sm text-gray-500">Created By</dt><dd className="font-medium">{deployment.createdBy?.displayName}</dd></div>
            <div><dt className="text-sm text-gray-500">Created At</dt><dd className="font-medium">{new Date(deployment.createdAt).toLocaleString()}</dd></div>
          </dl>
        </Card>

        {deployment.outputs && Object.keys(deployment.outputs).length > 0 && (
          <Card title="Outputs">
            <dl className="space-y-3">
              {Object.entries(deployment.outputs).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm text-gray-500">{key}</dt>
                  <dd className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>

      {deployment.errorMessage && (
        <Card title="Error">
          <pre className="text-red-600 text-sm whitespace-pre-wrap">{deployment.errorMessage}</pre>
        </Card>
      )}

      {(deployment.planOutput || deployment.applyOutput || deployment.destroyOutput || logs.length > 0) && (
        <Card title="Logs">
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap font-mono">
            {deployment.planOutput && `--- PLAN ---\n${deployment.planOutput}\n\n`}
            {deployment.applyOutput && `--- APPLY ---\n${deployment.applyOutput}\n\n`}
            {deployment.destroyOutput && `--- DESTROY ---\n${deployment.destroyOutput}\n\n`}
            {logs.length > 0 && `--- LIVE ---\n${logs.join('\n')}`}
          </pre>
        </Card>
      )}

      {Object.keys(deployment.variables).length > 0 && (
        <Card title="Variables">
          <dl className="space-y-2">
            {Object.entries(deployment.variables).map(([key, value]) => (
              <div key={key} className="flex gap-4">
                <dt className="text-sm font-medium text-gray-500 w-48">{key}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
