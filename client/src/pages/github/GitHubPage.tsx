import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { githubApi } from '../../api/github';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { GitBranch, Link2, Unlink, Play, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import type { GitHubRepo, GitHubWorkflow } from '@idp/shared';

export function GitHubPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [showDispatch, setShowDispatch] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<GitHubWorkflow | null>(null);
  const [ref, setRef] = useState('main');

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

  const { data: workflows = [] } = useQuery({
    queryKey: ['githubWorkflows', selectedRepo?.fullName],
    queryFn: () => {
      const [owner, repo] = selectedRepo!.fullName.split('/');
      return githubApi.listWorkflows(owner, repo);
    },
    enabled: !!selectedRepo,
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      await githubApi.connect({ token });
      toast.success('GitHub connected!');
      setToken('');
      queryClient.invalidateQueries({ queryKey: ['githubConnection'] });
      queryClient.invalidateQueries({ queryKey: ['githubRepos'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect GitHub?')) return;
    try {
      await githubApi.disconnect();
      toast.success('GitHub disconnected');
      queryClient.invalidateQueries({ queryKey: ['githubConnection'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Disconnect failed');
    }
  };

  const handleDispatch = async () => {
    if (!selectedRepo || !selectedWorkflow) return;
    try {
      const [owner, repo] = selectedRepo.fullName.split('/');
      await githubApi.dispatchWorkflow({ owner, repo, workflowId: selectedWorkflow.id, ref });
      toast.success('Workflow dispatched!');
      setShowDispatch(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Dispatch failed');
    }
  };

  if (connLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  if (!connection) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">GitHub Integration</h1>
        <Card title="Connect GitHub">
          <form onSubmit={handleConnect} className="space-y-4 max-w-md">
            <p className="text-sm text-gray-500 dark:text-gray-400">Enter a GitHub Personal Access Token to connect your account.</p>
            <Input label="Personal Access Token" type="password" value={token} onChange={(e) => setToken(e.target.value)} required placeholder="ghp_..." />
            <Button type="submit" loading={connecting}><Link2 className="w-4 h-4 mr-2" /> Connect</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">GitHub Integration</h1>
        <Button variant="danger" onClick={handleDisconnect}><Unlink className="w-4 h-4 mr-2" /> Disconnect</Button>
      </div>

      <Card title={`Connected as ${connection.username}`}>
        <div className="flex gap-2">
          {connection.scopes.map((s) => <Badge key={s}>{s}</Badge>)}
        </div>
      </Card>

      <Card title="Repositories">
        <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
          {repos.map((repo) => (
            <div key={repo.id} className="flex items-center justify-between py-3">
              <div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 hover:underline">
                    {repo.fullName} <ExternalLink className="w-3 h-3 inline" />
                  </a>
                  {repo.private && <Badge variant="warning">private</Badge>}
                </div>
                {repo.description && <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">{repo.description}</p>}
              </div>
              <Button size="sm" variant="secondary" onClick={() => { setSelectedRepo(repo); setShowDispatch(true); }}>
                <Play className="w-3 h-3 mr-1" /> Actions
              </Button>
            </div>
          ))}
          {repos.length === 0 && <p className="text-gray-500 dark:text-gray-400 py-4 text-center">No repositories found</p>}
        </div>
      </Card>

      <Modal open={showDispatch} onClose={() => { setShowDispatch(false); setSelectedRepo(null); }} title={`Workflows - ${selectedRepo?.fullName}`}>
        <div className="space-y-4">
          {workflows.length === 0 ? <p className="text-gray-500 dark:text-gray-400">No workflows found</p> : workflows.map((wf) => (
            <div key={wf.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg">
              <div>
                <p className="font-medium">{wf.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{wf.path}</p>
              </div>
              <Button size="sm" onClick={() => { setSelectedWorkflow(wf); }}>
                <Play className="w-3 h-3 mr-1" /> Run
              </Button>
            </div>
          ))}
          {selectedWorkflow && (
            <div className="border-t dark:border-gray-700 pt-4 space-y-3">
              <p className="font-medium">Dispatch: {selectedWorkflow.name}</p>
              <Input label="Branch/Ref" value={ref} onChange={(e) => setRef(e.target.value)} />
              <Button onClick={handleDispatch}>Dispatch Workflow</Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
