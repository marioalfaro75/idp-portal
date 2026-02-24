import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { githubApi } from '../../api/github';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { GitBranch, Link2, Unlink, ExternalLink, Shield, Info, Search, RefreshCw, Key, Activity } from 'lucide-react';
import { timeAgo } from '../../utils/time';
import toast from 'react-hot-toast';
import type { GitHubRepo } from '@idp/shared';

const REQUIRED_SCOPES = ['repo', 'workflow', 'read:org'];

const SCOPE_META: Record<string, string> = {
  repo: 'Full control of repositories',
  workflow: 'Update GitHub Action workflows',
  'read:org': 'Read org membership',
  'admin:org': 'Full org access',
  'write:org': 'Write org access',
  'admin:repo_hook': 'Full repo hook access',
  'write:repo_hook': 'Write repo hooks',
  'read:repo_hook': 'Read repo hooks',
  'admin:public_key': 'Full public key access',
  'write:public_key': 'Write public keys',
  'read:public_key': 'Read public keys',
  'admin:gpg_key': 'Full GPG key access',
  'write:gpg_key': 'Write GPG keys',
  'read:gpg_key': 'Read GPG keys',
  gist: 'Create gists',
  notifications: 'Access notifications',
  user: 'Update user profile',
  'read:user': 'Read user profile',
  'user:email': 'Access email addresses',
  'user:follow': 'Follow/unfollow users',
  delete_repo: 'Delete repositories',
  'write:packages': 'Upload packages',
  'read:packages': 'Download packages',
  'admin:enterprise': 'Full enterprise access',
  'manage_runners:enterprise': 'Manage enterprise runners',
  'read:enterprise': 'Read enterprise data',
  'write:discussion': 'Write discussions',
  'read:discussion': 'Read discussions',
  'admin:org_hook': 'Full org hook access',
  project: 'Full project access',
  'read:project': 'Read project access',
  'security_events': 'Read/write security events',
  codespace: 'Full codespace access',
  'codespace:secrets': 'Codespace secrets access',
  'audit_log': 'Read audit log',
  'read:audit_log': 'Read audit log',
  copilot: 'Copilot access',
  'manage_billing:copilot': 'Manage copilot billing',
};

export function GitHubPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showUpdateToken, setShowUpdateToken] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const { data: connection, isLoading: connLoading } = useQuery({
    queryKey: ['githubConnection'],
    queryFn: githubApi.getConnection,
    retry: false,
  });

  const { data: repos = [] } = useQuery({
    queryKey: ['githubRepos'],
    queryFn: githubApi.listRepos,
    enabled: !!connection,
  });

  const { data: usage } = useQuery({
    queryKey: ['githubUsage'],
    queryFn: githubApi.getUsage,
    enabled: !!connection,
  });

  const activeRepoSlugs = useMemo(() => new Set(usage?.activeRepoSlugs || []), [usage]);

  const languageOptions = useMemo(() => {
    const langs = new Set<string>();
    repos.forEach((r) => { if (r.language) langs.add(r.language); });
    return Array.from(langs).sort().map((l) => ({ value: l, label: l }));
  }, [repos]);

  const filteredRepos = useMemo(() => {
    let result = repos;
    if (repoSearch) {
      const q = repoSearch.toLowerCase();
      result = result.filter((r) => r.fullName.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
    }
    if (languageFilter) {
      result = result.filter((r) => r.language === languageFilter);
    }
    return result;
  }, [repos, repoSearch, languageFilter]);

  const missingScopes = useMemo(() => {
    if (!connection) return [];
    return REQUIRED_SCOPES.filter((s) => !connection.scopes.includes(s));
  }, [connection]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      await githubApi.connect({ token });
      toast.success('GitHub connected!');
      setToken('');
      queryClient.invalidateQueries({ queryKey: ['githubConnection'] });
      queryClient.invalidateQueries({ queryKey: ['githubRepos'] });
      queryClient.invalidateQueries({ queryKey: ['githubUsage'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const activeCount = (usage?.deployments.active || 0) + (usage?.services.active || 0);
    const message = activeCount > 0
      ? `You have ${activeCount} active resource(s) using this GitHub connection. Disconnecting may affect running deployments and services. Continue?`
      : 'Disconnect GitHub?';
    if (!confirm(message)) return;
    try {
      await githubApi.disconnect();
      toast.success('GitHub disconnected');
      queryClient.invalidateQueries({ queryKey: ['githubConnection'] });
      queryClient.invalidateQueries({ queryKey: ['githubUsage'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Disconnect failed');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await githubApi.testConnection();
      if (result.valid) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['githubConnection'] });
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleUpdateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingToken(true);
    try {
      await githubApi.updateToken({ token: newToken });
      toast.success('Token updated successfully');
      setNewToken('');
      setShowUpdateToken(false);
      queryClient.invalidateQueries({ queryKey: ['githubConnection'] });
      queryClient.invalidateQueries({ queryKey: ['githubRepos'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Token update failed');
    } finally {
      setUpdatingToken(false);
    }
  };

  if (connLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  // Disconnected state — setup guidance
  if (!connection) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">GitHub Integration</h1>

        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">What GitHub integration enables</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
              <li>Deploy infrastructure via GitHub Actions workflows</li>
              <li>Scaffold new services from templates into GitHub repos</li>
              <li>Dispatch and monitor workflow runs</li>
            </ul>
          </div>
        </div>

        <Card title="Connect GitHub">
          <div className="space-y-6 max-w-lg">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Required token scopes
              </p>
              <div className="space-y-2">
                {REQUIRED_SCOPES.map((scope) => (
                  <div key={scope} className="flex items-center gap-3 text-sm">
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-mono">{scope}</code>
                    <span className="text-gray-500 dark:text-gray-400">{SCOPE_META[scope]}</span>
                  </div>
                ))}
              </div>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,workflow,read:org&description=IDP+Portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Create a token with these scopes <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <Input label="Personal Access Token" type="password" value={token} onChange={(e) => setToken(e.target.value)} required placeholder="ghp_..." />
              <Button type="submit" loading={connecting}><Link2 className="w-4 h-4 mr-2" /> Connect</Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  // Connected state
  const hasUsage = usage && (usage.deployments.total > 0 || usage.services.total > 0);
  const repoCountLabel = filteredRepos.length === repos.length
    ? `Repositories (${repos.length})`
    : `Repositories (${filteredRepos.length} of ${repos.length})`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">GitHub Integration</h1>

      {/* Connection Status Card */}
      <Card
        title={`Connected as ${connection.username}`}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={handleTest} loading={testing}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Test
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowUpdateToken(true)}>
              <Key className="w-3.5 h-3.5 mr-1.5" /> Update Token
            </Button>
            <Button size="sm" variant="danger" onClick={handleDisconnect}>
              <Unlink className="w-3.5 h-3.5 mr-1.5" /> Disconnect
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" /> {connection.username}
            </span>
            <span>Connected {timeAgo(connection.createdAt)}</span>
            <span>Updated {timeAgo(connection.updatedAt)}</span>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Token Scopes</p>
            <div className="flex flex-wrap gap-1.5">
              {connection.scopes.map((s) => (
                <Badge key={s} variant="success" title={SCOPE_META[s] || s}>{s}</Badge>
              ))}
              {missingScopes.map((s) => (
                <Badge key={s} variant="warning" title={`Required scope missing: ${SCOPE_META[s] || s}`}>{s} (missing)</Badge>
              ))}
            </div>
          </div>

          {missingScopes.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Your token is missing required scopes: {missingScopes.join(', ')}. Some features may not work.{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,workflow,read:org&description=IDP+Portal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Create a new token
                </a>{' '}
                and use Update Token to replace it.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Active Usage Card */}
      {hasUsage && (
        <Card
          title="Active Usage"
          actions={<Activity className="w-4 h-4 text-gray-400" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deployments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">GitHub Deployments</h4>
                <Badge variant="default">{usage!.deployments.total}</Badge>
                {usage!.deployments.active > 0 && <Badge variant="success">{usage!.deployments.active} active</Badge>}
              </div>
              {usage!.deployments.items.length > 0 ? (
                <div className="space-y-2">
                  {usage!.deployments.items.slice(0, 5).map((d) => (
                    <a key={d.id} href={`/deployments/${d.id}`} className="block text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded p-2 -mx-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-primary-600 dark:text-primary-400">{d.name}</span>
                        <Badge variant={d.status === 'applied' ? 'success' : d.status === 'failed' ? 'danger' : 'default'}>{d.status}</Badge>
                      </div>
                      {d.githubRepo && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{d.githubRepo} &middot; {timeAgo(d.createdAt)}</p>}
                    </a>
                  ))}
                  {usage!.deployments.total > 5 && (
                    <a href="/deployments" className="block text-sm text-primary-600 dark:text-primary-400 hover:underline pt-1">
                      View all deployments...
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No GitHub deployments yet</p>
              )}
            </div>

            {/* Services */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Scaffolded Services</h4>
                <Badge variant="default">{usage!.services.total}</Badge>
                {usage!.services.active > 0 && <Badge variant="success">{usage!.services.active} active</Badge>}
              </div>
              {usage!.services.items.length > 0 ? (
                <div className="space-y-2">
                  {usage!.services.items.slice(0, 5).map((s) => (
                    <a key={s.id} href={`/services/${s.id}`} className="block text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded p-2 -mx-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-primary-600 dark:text-primary-400">{s.name}</span>
                        <Badge variant={s.status === 'active' ? 'success' : s.status === 'failed' ? 'danger' : 'default'}>{s.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.githubRepoSlug} &middot; {timeAgo(s.createdAt)}</p>
                    </a>
                  ))}
                  {usage!.services.total > 5 && (
                    <a href="/services" className="block text-sm text-primary-600 dark:text-primary-400 hover:underline pt-1">
                      View all services...
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No scaffolded services yet</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Repositories Card */}
      <Card title={repoCountLabel}>
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Search repositories..."
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 pl-9 pr-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="w-48">
              <Select
                options={languageOptions}
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Repo list */}
          <div className="divide-y dark:divide-gray-700 max-h-[32rem] overflow-y-auto">
            {filteredRepos.map((repo) => {
              const [owner, name] = repo.fullName.split('/');
              return (
                <div key={repo.id} className="group py-3">
                  <div className="flex items-center gap-2">
                    <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 min-w-0 shrink">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{owner} /</span>
                      <span className="font-medium text-primary-600 dark:text-primary-400 hover:underline truncate">{name}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </a>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {repo.private && <Badge variant="warning">private</Badge>}
                      {repo.language && <Badge variant="info">{repo.language}</Badge>}
                      {activeRepoSlugs.has(repo.fullName) && <Badge variant="success">in use</Badge>}
                    </div>
                    {repo.updatedAt && <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{timeAgo(repo.updatedAt)}</span>}
                  </div>
                  {repo.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 pl-0">{repo.description}</p>
                  )}
                </div>
              );
            })}
            {filteredRepos.length === 0 && repos.length > 0 && (
              <p className="text-gray-500 dark:text-gray-400 py-4 text-center">No repositories match your filters</p>
            )}
            {repos.length === 0 && <p className="text-gray-500 dark:text-gray-400 py-4 text-center">No repositories found</p>}
          </div>
        </div>
      </Card>

      {/* Update Token Modal */}
      <Modal open={showUpdateToken} onClose={() => { setShowUpdateToken(false); setNewToken(''); }} title="Update GitHub Token">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Replace your Personal Access Token without disconnecting. Your existing connection, deployments, and services will be preserved.
          </p>
          <a
            href="https://github.com/settings/tokens/new?scopes=repo,workflow,read:org&description=IDP+Portal"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Create a new token on GitHub <ExternalLink className="w-3 h-3" />
          </a>
          <form onSubmit={handleUpdateToken} className="space-y-4">
            <Input label="New Personal Access Token" type="password" value={newToken} onChange={(e) => setNewToken(e.target.value)} required placeholder="ghp_..." />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => { setShowUpdateToken(false); setNewToken(''); }}>Cancel</Button>
              <Button type="submit" loading={updatingToken}>Update Token</Button>
            </div>
          </form>
        </div>
      </Modal>

    </div>
  );
}
