import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { templatesApi } from '../../api/templates';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/auth-store';
import { PERMISSIONS, CLOUD_PROVIDERS, TEMPLATE_CATEGORIES } from '@idp/shared';
import { Search, RefreshCw, Box } from 'lucide-react';
import toast from 'react-hot-toast';

const providerColor = (p: string) => {
  switch (p) {
    case 'aws': return 'warning' as const;
    case 'gcp': return 'info' as const;
    case 'azure': return 'default' as const;
    default: return 'default' as const;
  }
};

export function TemplateCatalogPage() {
  const [provider, setProvider] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [scaffoldOnly, setScaffoldOnly] = useState(false);
  const { hasPermission } = useAuthStore();

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['templates', { provider, category, search }],
    queryFn: () => templatesApi.list({ provider: provider || undefined, category: category || undefined, search: search || undefined }),
  });

  const filteredTemplates = scaffoldOnly ? templates.filter((t: any) => t.hasScaffold) : templates;

  const handleSync = async () => {
    try {
      const result = await templatesApi.sync();
      toast.success(`Synced ${result.count} templates`);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Sync failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Template Catalog</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pre-built Terraform blueprints for provisioning cloud infrastructure. Pick a template, configure variables, and deploy — or scaffold into a GitHub repo as a Service.{' '}
            <Link to="/help" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              Learn more &rarr;
            </Link>
          </p>
        </div>
        {hasPermission(PERMISSIONS.TEMPLATES_SYNC) && (
          <Button variant="secondary" onClick={handleSync}>
            <RefreshCw className="w-4 h-4 mr-2" /> Sync Templates
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          options={CLOUD_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-48"
        />
        <Select
          options={TEMPLATE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-48"
        />
        <button
          onClick={() => setScaffoldOnly(!scaffoldOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            scaffoldOnly
              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-600'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Box className="w-4 h-4" />
          Scaffoldable
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {scaffoldOnly ? 'No scaffoldable templates found.' : 'No templates found. Try syncing templates first.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((t: any) => (
            <Link key={t.id} to={`/templates/${t.slug}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={providerColor(t.provider)}>{t.provider.toUpperCase()}</Badge>
                      {t.hasScaffold && (
                        <Badge variant="success">
                          <Box className="w-3 h-3 mr-1 inline" />
                          Scaffold
                        </Badge>
                      )}
                    </div>
                    <Badge>{t.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{t.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {t.tags?.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                    {t.hasScaffold && (
                      <Link
                        to={`/templates/${t.slug}/scaffold`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        <Box className="w-3.5 h-3.5" />
                        Scaffold
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
