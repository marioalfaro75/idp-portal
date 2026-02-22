import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cloudConnectionsApi } from '../../api/cloud-connections';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuthStore } from '../../stores/auth-store';
import { PERMISSIONS, CLOUD_PROVIDERS } from '@idp/shared';
import type { CloudConnection } from '@idp/shared';
import { Plus, Trash2, CheckCircle, Cloud, Layers, Rocket, Info, ExternalLink, AlertTriangle } from 'lucide-react';
import { timeAgo } from '../../utils/time';
import toast from 'react-hot-toast';

const statusVariant = (s: string) => s === 'connected' ? 'success' as const : s === 'error' ? 'danger' as const : 'warning' as const;

const providerLabels: Record<string, string> = {
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud Platform',
  azure: 'Microsoft Azure',
};

const providerDotColors: Record<string, string> = {
  aws: 'bg-amber-500',
  gcp: 'bg-blue-500',
  azure: 'bg-sky-600',
};

const providerGuides: Record<string, { title: string; steps: string[]; links: { label: string; url: string }[] }> = {
  aws: {
    title: 'AWS Setup Guide',
    steps: [
      'Go to IAM → Users → Create user',
      'Attach the AdministratorAccess policy (or a scoped policy for Terraform)',
      'Go to Security credentials → Create access key',
      'Select "Command Line Interface (CLI)" as the use case',
    ],
    links: [
      { label: 'Open IAM Console', url: 'https://console.aws.amazon.com/iam/home#/users' },
      { label: 'AWS IAM best practices', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html' },
    ],
  },
  gcp: {
    title: 'GCP Setup Guide',
    steps: [
      'Go to IAM & Admin → Service Accounts',
      'Create a service account with the Editor role (or scoped roles)',
      'Go to Keys → Add Key → Create new key → JSON',
      'Paste the downloaded JSON file contents below',
    ],
    links: [
      { label: 'Open Service Accounts', url: 'https://console.cloud.google.com/iam-admin/serviceaccounts' },
      { label: 'GCP IAM roles reference', url: 'https://cloud.google.com/iam/docs/understanding-roles' },
    ],
  },
  azure: {
    title: 'Azure Setup Guide',
    steps: [
      'Go to Azure Active Directory → App registrations → New registration',
      'Note the Application (client) ID and Directory (tenant) ID',
      'Go to Certificates & secrets → New client secret',
      'Assign the Contributor role on your subscription (Subscriptions → IAM)',
    ],
    links: [
      { label: 'Open App Registrations', url: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade' },
      { label: 'Azure RBAC roles', url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles' },
    ],
  },
};

const providerTroubleshooting: Record<string, string[]> = {
  aws: [
    'Verify the Access Key ID and Secret Access Key are correct',
    'Ensure the IAM user has not been deactivated',
    'Check that the access key status is Active in the IAM console',
  ],
  gcp: [
    'Verify the Service Account Key JSON is valid and complete',
    'Ensure the service account has not been disabled',
    'Check that the Project ID matches the service account\'s project',
  ],
  azure: [
    'Verify the Client ID, Client Secret, and Tenant ID are correct',
    'Check that the client secret has not expired',
    'Ensure the app registration is in the correct tenant',
  ],
};

function metadataSubtitle(c: CloudConnection): string | null {
  const m = c.metadata;
  if (!m) return null;
  const parts: string[] = [];
  if (m.region) parts.push(m.region);
  if (m.projectId) parts.push(`Project: ${m.projectId}`);
  if (m.subscriptionId) parts.push(`Sub: ${m.subscriptionId}`);
  if (m.tenantId) parts.push(`Tenant: ${m.tenantId}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function CloudConnectionsPage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', provider: '', accessKeyId: '', secretAccessKey: '', region: '', projectId: '', serviceAccountKey: '', subscriptionId: '', tenantId: '', clientId: '', clientSecret: '' });
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: connections = [], isLoading } = useQuery({ queryKey: ['cloudConnections'], queryFn: cloudConnectionsApi.list });

  const buildCredentials = () => {
    if (form.provider === 'aws') return { accessKeyId: form.accessKeyId, secretAccessKey: form.secretAccessKey, region: form.region };
    if (form.provider === 'gcp') return { projectId: form.projectId, serviceAccountKey: form.serviceAccountKey };
    return { subscriptionId: form.subscriptionId, tenantId: form.tenantId, clientId: form.clientId, clientSecret: form.clientSecret };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationError(null);
    try {
      const credentials: any = buildCredentials();
      const payload = { name: form.name, provider: form.provider as any, credentials };

      // Test credentials against the cloud provider first
      const testResult = await cloudConnectionsApi.test(payload);
      if (!testResult.valid) {
        setValidationError(testResult.message);
        setLoading(false);
        return;
      }

      // Credentials valid — create the connection
      await cloudConnectionsApi.create(payload);
      toast.success('Connection created');
      queryClient.invalidateQueries({ queryKey: ['cloudConnections'] });
      setShowAdd(false);
      setValidationError(null);
      setForm({ name: '', provider: '', accessKeyId: '', secretAccessKey: '', region: '', projectId: '', serviceAccountKey: '', subscriptionId: '', tenantId: '', clientId: '', clientSecret: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id: string) => {
    try {
      const result = await cloudConnectionsApi.validate(id);
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ['cloudConnections'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Validation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this connection?')) return;
    try {
      await cloudConnectionsApi.delete(id);
      toast.success('Connection deleted');
      queryClient.invalidateQueries({ queryKey: ['cloudConnections'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Delete failed');
    }
  };

  // Stats
  const errorCount = connections.filter((c) => c.status === 'error').length;
  const distinctProviders = [...new Set(connections.map((c) => c.provider))];
  const providerBreakdown = distinctProviders.map((p) => {
    const count = connections.filter((c) => c.provider === p).length;
    return `${count} ${p.toUpperCase()}`;
  }).join(', ');
  const totalDeployments = connections.reduce((sum, c) => sum + (c.deploymentCount || 0), 0);

  const stats = [
    {
      label: 'Total Connections',
      value: connections.length,
      secondary: errorCount > 0 ? `${errorCount} with errors` : 'All healthy',
      secondaryColor: errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      icon: Cloud,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/50',
    },
    {
      label: 'Providers',
      value: distinctProviders.length,
      secondary: providerBreakdown || 'None',
      secondaryColor: 'text-gray-500 dark:text-gray-400',
      icon: Layers,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50',
    },
    {
      label: 'Deployments',
      value: totalDeployments,
      secondary: `Across ${connections.length} connection${connections.length !== 1 ? 's' : ''}`,
      secondaryColor: 'text-gray-500 dark:text-gray-400',
      icon: Rocket,
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/50',
    },
  ];

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (c: CloudConnection) => (
        <div>
          <span className="font-medium">{c.name}</span>
          {c.validationMessage && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{c.validationMessage}</p>
          )}
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (c: CloudConnection) => (
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${providerDotColors[c.provider] || 'bg-gray-400'}`} />
          <span className="text-sm">{providerLabels[c.provider] || c.provider.toUpperCase()}</span>
        </div>
      ),
    },
    {
      key: 'accountIdentifier',
      header: 'Account',
      render: (c: CloudConnection) => {
        const subtitle = metadataSubtitle(c);
        return (
          <div>
            <span className="text-sm">{c.accountIdentifier || '—'}</span>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: CloudConnection) => (
        <div>
          <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
          {c.lastValidatedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Checked {timeAgo(c.lastValidatedAt)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'deploymentCount',
      header: 'Deployments',
      render: (c: CloudConnection) => <span className="text-sm">{c.deploymentCount ?? 0}</span>,
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (c: CloudConnection) => (
        <div>
          <span className="text-sm">{c.createdBy?.displayName || '—'}</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(c.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c: CloudConnection) => (
        <div className="flex gap-2">
          <button onClick={() => handleValidate(c.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Validate"><CheckCircle className="w-4 h-4" /></button>
          {hasPermission(PERMISSIONS.CLOUD_CONNECTIONS_DELETE) && (
            <button onClick={() => handleDelete(c.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cloud Connections</h1>
        {hasPermission(PERMISSIONS.CLOUD_CONNECTIONS_CREATE) && (
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" /> Add Connection</Button>
        )}
      </div>

      {/* Stat Cards */}
      {!isLoading && connections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className={`text-xs ${stat.secondaryColor}`}>{stat.secondary}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        {isLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
          : <Table columns={columns} data={connections} emptyMessage="No cloud connections configured" />}
      </Card>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setValidationError(null); }} title="Add Cloud Connection" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Connection Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Provider" options={CLOUD_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))} value={form.provider} onChange={(e) => { setForm({ ...form, provider: e.target.value }); setValidationError(null); }} />
          {form.provider && providerGuides[form.provider] && (() => {
            const guide = providerGuides[form.provider];
            return (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-300">{guide.title}</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-800 dark:text-blue-300/90">
                      {guide.steps.map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {guide.links.map((link) => (
                        <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                          {link.label} <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          {form.provider === 'aws' && (<>
            <Input label="Access Key ID" value={form.accessKeyId} onChange={(e) => setForm({ ...form, accessKeyId: e.target.value })} required />
            <Input label="Secret Access Key" type="password" value={form.secretAccessKey} onChange={(e) => setForm({ ...form, secretAccessKey: e.target.value })} required />
            <Input label="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} required placeholder="us-east-1" />
          </>)}
          {form.provider === 'gcp' && (<>
            <Input label="Project ID" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Account Key (JSON)</label>
              <textarea className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" rows={4} value={form.serviceAccountKey} onChange={(e) => setForm({ ...form, serviceAccountKey: e.target.value })} required />
            </div>
          </>)}
          {form.provider === 'azure' && (<>
            <Input label="Subscription ID" value={form.subscriptionId} onChange={(e) => setForm({ ...form, subscriptionId: e.target.value })} required />
            <Input label="Tenant ID" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} required />
            <Input label="Client ID" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required />
            <Input label="Client Secret" type="password" value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} required />
          </>)}
          {validationError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-900 dark:text-red-300">Connection validation failed</p>
                  <p className="mt-1 text-red-700 dark:text-red-400 break-words">{validationError}</p>
                  {providerTroubleshooting[form.provider] && (
                    <div className="mt-2 text-red-800 dark:text-red-300/90">
                      <p className="font-medium">Troubleshooting tips:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {providerTroubleshooting[form.provider].map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {providerGuides[form.provider] && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {providerGuides[form.provider].links.map((link) => (
                        <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline">
                          {link.label} <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-red-700 dark:text-red-400">Please correct your credentials above and try again.</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!form.name || !form.provider}>{validationError ? 'Retry' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
