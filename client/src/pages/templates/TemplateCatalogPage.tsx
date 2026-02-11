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
import { Search, RefreshCw } from 'lucide-react';
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
  const { hasPermission } = useAuthStore();

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['templates', { provider, category, search }],
    queryFn: () => templatesApi.list({ provider: provider || undefined, category: category || undefined, search: search || undefined }),
  });

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
        <h1 className="text-2xl font-bold">Template Catalog</h1>
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
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
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No templates found. Try syncing templates first.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Link key={t.id} to={`/templates/${t.slug}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={providerColor(t.provider)}>{t.provider.toUpperCase()}</Badge>
                    <Badge>{t.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{t.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
                    ))}
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
