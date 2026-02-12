import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../../api/templates';
import { cloudConnectionsApi } from '../../api/cloud-connections';
import { deploymentsApi } from '../../api/deployments';
import { githubApi } from '../../api/github';
import { settingsApi } from '../../api/settings';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DynamicForm } from '../../components/forms/DynamicForm';
import { ArrowLeft, Rocket } from 'lucide-react';
import toast from 'react-hot-toast';

export function DeployPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [executionMethod, setExecutionMethod] = useState<'local' | 'github'>('local');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubWorkflowId, setGithubWorkflowId] = useState('');
  const [githubRef, setGithubRef] = useState('main');

  const { data: template } = useQuery({
    queryKey: ['template', slug],
    queryFn: () => templatesApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['cloudConnections'],
    queryFn: cloudConnectionsApi.list,
  });

  const { data: githubConnection } = useQuery({
    queryKey: ['github-connection'],
    queryFn: githubApi.getConnection,
    enabled: executionMethod === 'github',
    retry: false,
  });

  const { data: repos = [] } = useQuery({
    queryKey: ['github-repos'],
    queryFn: githubApi.listRepos,
    enabled: executionMethod === 'github' && !!githubConnection,
  });

  const selectedRepoFullName = repos.find((r) => r.fullName === githubRepo)?.fullName || '';
  const [repoOwner, repoName] = selectedRepoFullName ? selectedRepoFullName.split('/') : ['', ''];

  const { data: workflows = [] } = useQuery({
    queryKey: ['github-workflows', repoOwner, repoName],
    queryFn: () => githubApi.listWorkflows(repoOwner, repoName),
    enabled: executionMethod === 'github' && !!repoOwner && !!repoName,
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
    enabled: executionMethod === 'github',
  });

  // Pre-populate from admin defaults when switching to GitHub
  useEffect(() => {
    if (executionMethod === 'github' && settings) {
      if (settings['github.defaultRepo'] && !githubRepo) {
        setGithubRepo(settings['github.defaultRepo']);
      }
      if (settings['github.defaultRef'] && githubRef === 'main') {
        setGithubRef(settings['github.defaultRef']);
      }
    }
  }, [executionMethod, settings]);

  // Pre-populate workflow from admin defaults when workflows load
  useEffect(() => {
    if (executionMethod === 'github' && settings && workflows.length > 0 && !githubWorkflowId) {
      const defaultWorkflow = settings['github.defaultWorkflow'];
      if (defaultWorkflow) {
        const match = workflows.find((w) => w.path.endsWith(defaultWorkflow) || String(w.id) === defaultWorkflow || w.name === defaultWorkflow);
        if (match) setGithubWorkflowId(String(match.id));
      }
    }
  }, [executionMethod, settings, workflows]);

  const filteredConnections = connections.filter((c) => c.provider === template?.provider);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
    setLoading(true);
    try {
      const deployment = await deploymentsApi.create({
        name,
        templateId: template.id,
        cloudConnectionId: connectionId,
        variables,
        executionMethod,
        ...(executionMethod === 'github' && {
          githubRepo,
          githubWorkflowId,
          githubRef,
        }),
      });
      toast.success('Deployment started!');
      navigate(`/deployments/${deployment.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!template) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  const isGithubReady = executionMethod !== 'github' || (githubRepo && githubWorkflowId);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link to={`/templates/${slug}`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Deploy: {template.name}</h1>
      </div>

      <form onSubmit={handleDeploy} className="space-y-6">
        <Card title="Deployment Settings">
          <div className="space-y-4">
            <Input label="Deployment Name *" value={name} onChange={(e) => setName(e.target.value)} required placeholder="my-deployment" />
            <Select
              label="Cloud Connection *"
              options={filteredConnections.map((c) => ({ value: c.id, label: `${c.name} (${c.accountIdentifier})` }))}
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
            />
          </div>
        </Card>

        <Card title="Execution Method">
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="executionMethod"
                  value="local"
                  checked={executionMethod === 'local'}
                  onChange={() => setExecutionMethod('local')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">Local (Server)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="executionMethod"
                  value="github"
                  checked={executionMethod === 'github'}
                  onChange={() => setExecutionMethod('github')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">GitHub Actions</span>
              </label>
            </div>

            {executionMethod === 'github' && !githubConnection && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                You need to connect your GitHub account first.{' '}
                <Link to="/github" className="text-primary-600 hover:underline font-medium">Connect GitHub</Link>
              </div>
            )}

            {executionMethod === 'github' && githubConnection && (
              <div className="space-y-4">
                <Select
                  label="GitHub Repository *"
                  options={repos.map((r) => ({ value: r.fullName, label: r.fullName }))}
                  value={githubRepo}
                  onChange={(e) => {
                    setGithubRepo(e.target.value);
                    setGithubWorkflowId('');
                  }}
                />
                {githubRepo && (
                  <Select
                    label="Workflow *"
                    options={workflows.map((w) => ({ value: String(w.id), label: `${w.name} (${w.path})` }))}
                    value={githubWorkflowId}
                    onChange={(e) => setGithubWorkflowId(e.target.value)}
                  />
                )}
                <Input
                  label="Branch / Ref"
                  value={githubRef}
                  onChange={(e) => setGithubRef(e.target.value)}
                  placeholder="main"
                />
              </div>
            )}
          </div>
        </Card>

        {template.variables.length > 0 && (
          <Card title="Template Variables">
            <DynamicForm
              variables={template.variables}
              values={variables}
              onChange={(n, v) => setVariables((prev) => ({ ...prev, [n]: v }))}
            />
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" loading={loading} disabled={!name || !connectionId || !isGithubReady}>
            <Rocket className="w-4 h-4 mr-2" /> Deploy
          </Button>
        </div>
      </form>
    </div>
  );
}
