import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deploymentsApi } from '../../api/deployments';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/auth-store';
import { PERMISSIONS } from '@idp/shared';
import { ArrowLeft, Trash2, RotateCcw, ExternalLink, AlertTriangle, ChevronDown, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

function extractErrorSummary(errorMessage: string): { summary: string; hasDetails: boolean } {
  const lines = errorMessage.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { summary: errorMessage, hasDetails: false };
  // Look for first Terraform Error: line
  for (const line of lines) {
    const match = line.match(/[│|]?\s*Error:\s*(.+)/);
    if (match) return { summary: match[0].trim(), hasDetails: lines.length > 1 };
  }
  // Fall back to first non-empty line
  return { summary: lines[0], hasDetails: lines.length > 1 };
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'succeeded': return 'success' as const;
    case 'failed': return 'danger' as const;
    case 'applying': case 'planning': case 'destroying': case 'rolling_back': case 'dispatched': case 'running': return 'warning' as const;
    case 'rolled_back': return 'info' as const;
    default: return 'info' as const;
  }
};

export function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<string[]>([]);
  const [destroying, setDestroying] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [logsCopied, setLogsCopied] = useState(false);

  const { data: deployment, isLoading } = useQuery({
    queryKey: ['deployment', id],
    queryFn: () => deploymentsApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      return d && ['pending', 'planning', 'applying', 'destroying', 'rolling_back', 'dispatched', 'running'].includes(d.status) ? 2000 : false;
    },
  });

  useEffect(() => {
    if (!id || !deployment) return;
    // Skip SSE for GitHub deployments (logs come from GitHub)
    if (deployment.executionMethod === 'github') return;
    if (!['planning', 'applying', 'destroying', 'rolling_back'].includes(deployment.status)) return;

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

  const handleRollback = async () => {
    if (!confirm('Are you sure you want to roll back this deployment? This will tear down the infrastructure.')) return;
    setRollingBack(true);
    try {
      await deploymentsApi.rollback(id!);
      toast.success('Rollback initiated');
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Rollback failed');
    } finally {
      setRollingBack(false);
    }
  };

  if (isLoading || !deployment) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  const canDestroy = deployment.status === 'succeeded' &&
    hasPermission(PERMISSIONS.DEPLOYMENTS_DESTROY) &&
    (user?.role?.name === 'Admin' || deployment.createdById === user?.id);

  const canRollback = deployment.status === 'succeeded' &&
    hasPermission(PERMISSIONS.DEPLOYMENTS_DESTROY) &&
    (user?.role?.name === 'Admin' || deployment.createdById === user?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/deployments" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{deployment.name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={statusVariant(deployment.status)}>{deployment.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {canRollback && (
            <Button variant="secondary" onClick={handleRollback} loading={rollingBack}>
              <RotateCcw className="w-4 h-4 mr-2" /> Rollback
            </Button>
          )}
          {canDestroy && (
            <Button variant="danger" onClick={handleDestroy} loading={destroying}>
              <Trash2 className="w-4 h-4 mr-2" /> Destroy
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Details">
          <dl className="space-y-3">
            <div><dt className="text-sm text-gray-500 dark:text-gray-400">Template</dt><dd className="font-medium">{deployment.template?.name}</dd></div>
            <div><dt className="text-sm text-gray-500 dark:text-gray-400">Cloud Connection</dt><dd className="font-medium">{deployment.cloudConnection?.name}</dd></div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Execution Method</dt>
              <dd className="font-medium">{deployment.executionMethod === 'github' ? 'GitHub Actions' : 'Local'}</dd>
            </div>
            {deployment.executionMethod === 'github' && deployment.githubRepo && (
              <div><dt className="text-sm text-gray-500 dark:text-gray-400">GitHub Repo</dt><dd className="font-medium">{deployment.githubRepo}</dd></div>
            )}
            {deployment.executionMethod === 'github' && deployment.githubRunUrl && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">GitHub Run</dt>
                <dd>
                  <a href={deployment.githubRunUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium inline-flex items-center gap-1">
                    View on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </dd>
              </div>
            )}
            <div><dt className="text-sm text-gray-500 dark:text-gray-400">Created By</dt><dd className="font-medium">{deployment.createdBy?.displayName}</dd></div>
            <div><dt className="text-sm text-gray-500 dark:text-gray-400">Created At</dt><dd className="font-medium">{new Date(deployment.createdAt).toLocaleString()}</dd></div>
          </dl>
        </Card>

        {deployment.outputs && Object.keys(deployment.outputs).length > 0 && (
          <Card title="Outputs">
            <dl className="space-y-3">
              {Object.entries(deployment.outputs).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{key}</dt>
                  <dd className="font-mono text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded mt-1 break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>

      {deployment.errorMessage && (() => {
        const { summary, hasDetails } = extractErrorSummary(deployment.errorMessage);
        return (
          <Card title="Error">
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">{summary}</p>
                  {deployment.executionMethod === 'github' && deployment.githubRunUrl && (
                    <a href={deployment.githubRunUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1 mt-2">
                      View on GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              {hasDetails && (
                <details className="mt-3">
                  <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer hover:underline inline-flex items-center gap-1">
                    <ChevronDown className="w-3 h-3" /> Full error details
                  </summary>
                  <pre className="mt-2 text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap bg-red-100 dark:bg-red-900/30 p-3 rounded max-h-64 overflow-y-auto">{deployment.errorMessage}</pre>
                </details>
              )}
            </div>
          </Card>
        );
      })()}

      {(deployment.planOutput || deployment.applyOutput || deployment.destroyOutput || logs.length > 0) && (() => {
        const isGitHub = deployment.executionMethod === 'github';
        const planLabel = isGitHub ? '--- SETUP ---' : '--- PLAN ---';
        const applyLabel = isGitHub ? '--- WORKFLOW RUN ---' : '--- APPLY ---';
        const logTitle = isGitHub ? 'GitHub Actions Logs' : 'Logs';
        const buildLogsText = () => {
          let text = '';
          if (deployment.planOutput) text += `${planLabel}\n${deployment.planOutput}\n\n`;
          if (deployment.applyOutput) text += `${applyLabel}\n${deployment.applyOutput}\n\n`;
          if (deployment.destroyOutput) text += `--- ${['rolling_back', 'rolled_back'].includes(deployment.status) ? 'ROLLBACK' : 'DESTROY'} ---\n${deployment.destroyOutput}\n\n`;
          if (logs.length > 0) text += `--- LIVE ---\n${logs.join('\n')}`;
          return text;
        };
        const handleCopyLogs = () => {
          navigator.clipboard.writeText(buildLogsText()).then(() => {
            setLogsCopied(true);
            setTimeout(() => setLogsCopied(false), 2000);
          });
        };
        return (
          <Card title={logTitle} actions={
            <button onClick={handleCopyLogs} className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              {logsCopied ? <><Check className="w-4 h-4 text-green-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Logs</>}
            </button>
          }>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap font-mono">
              {deployment.planOutput && `${planLabel}\n${deployment.planOutput}\n\n`}
              {deployment.applyOutput && `${applyLabel}\n${deployment.applyOutput}\n\n`}
              {deployment.destroyOutput && `--- ${['rolling_back', 'rolled_back'].includes(deployment.status) ? 'ROLLBACK' : 'DESTROY'} ---\n${deployment.destroyOutput}\n\n`}
              {logs.length > 0 && `--- LIVE ---\n${logs.join('\n')}`}
            </pre>
          </Card>
        );
      })()}

      {Object.keys(deployment.variables).length > 0 && (
        <Card title="Variables">
          <dl className="space-y-2">
            {Object.entries(deployment.variables).map(([key, value]) => (
              <div key={key} className="flex gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 w-48">{key}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
