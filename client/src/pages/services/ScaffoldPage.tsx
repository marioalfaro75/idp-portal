import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../../api/templates';
import { githubApi } from '../../api/github';
import { servicesApi } from '../../api/services';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DynamicForm } from '../../components/forms/DynamicForm';
import { ArrowLeft, Box } from 'lucide-react';
import toast from 'react-hot-toast';

export function ScaffoldPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const { data: template } = useQuery({
    queryKey: ['template', slug],
    queryFn: () => templatesApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const { data: githubStatus } = useQuery({
    queryKey: ['githubStatus'],
    queryFn: githubApi.getStatus,
    retry: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
    setLoading(true);
    try {
      const service = await servicesApi.create({
        name,
        templateId: template.id,
        parameters: variables,
      });
      toast.success('Service scaffolding started!');
      navigate(`/services/${service.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Scaffold failed');
    } finally {
      setLoading(false);
    }
  };

  if (!template) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link to={`/templates/${slug}`} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Scaffold: {template.name}</h1>
      </div>

      {!githubStatus?.configured && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300">
          GitHub App is not configured. Ask a Portal Admin to set it up in the{' '}
          <Link to="/admin" className="text-primary-600 hover:underline font-medium">Portal Administration</Link>{' '}
          page.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Service Settings">
          <div className="space-y-4">
            <Input
              label="Service Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="my-service"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              A GitHub repository will be created with this name. Use lowercase letters, numbers, and hyphens.
            </p>
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
          <Button type="submit" loading={loading} disabled={!name || !githubStatus?.configured}>
            <Box className="w-4 h-4 mr-2" /> Scaffold Service
          </Button>
        </div>
      </form>
    </div>
  );
}
