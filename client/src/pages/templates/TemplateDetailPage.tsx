import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../../api/templates';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/auth-store';
import { PERMISSIONS } from '@idp/shared';
import { ArrowLeft, Rocket, Box } from 'lucide-react';

export function TemplateDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { hasPermission } = useAuthStore();

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', slug],
    queryFn: () => templatesApi.getBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  if (!template) {
    return <div className="text-center py-12 text-gray-500">Template not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/templates" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">{template.description}</p>
        </div>
        {template.hasScaffold && hasPermission(PERMISSIONS.SERVICES_CREATE) && (
          <Link to={`/templates/${slug}/scaffold`}>
            <Button>
              <Box className="w-4 h-4 mr-2" /> Scaffold Service
            </Button>
          </Link>
        )}
        {!template.hasScaffold && hasPermission(PERMISSIONS.DEPLOYMENTS_CREATE) && (
          <Link to={`/templates/${slug}/deploy`}>
            <Button>
              <Rocket className="w-4 h-4 mr-2" /> Deploy
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <Badge variant="info">{template.provider.toUpperCase()}</Badge>
        <Badge>{template.category}</Badge>
        <Badge variant="default">v{template.version}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Variables">
          {template.variables.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No variables defined</p>
          ) : (
            <div className="space-y-3">
              {template.variables.map((v) => (
                <div key={v.name} className="border-b dark:border-gray-700 pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-semibold text-primary-700 dark:text-primary-400">{v.name}</code>
                    <div className="flex gap-2">
                      <Badge variant="default">{v.type}</Badge>
                      {v.required && <Badge variant="danger">required</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{v.description}</p>
                  {v.default && <p className="text-xs text-gray-400 mt-1">Default: {v.default}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Outputs">
          {template.outputs.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No outputs defined</p>
          ) : (
            <div className="space-y-3">
              {template.outputs.map((o) => (
                <div key={o.name} className="border-b dark:border-gray-700 pb-3 last:border-0">
                  <code className="text-sm font-semibold text-primary-700 dark:text-primary-400">{o.name}</code>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{o.description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {template.tags.length > 0 && (
        <Card title="Tags">
          <div className="flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
