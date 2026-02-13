import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { servicesApi } from '../../api/services';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import type { Service } from '@idp/shared';
import { ExternalLink } from 'lucide-react';

const statusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'success' as const;
    case 'failed': return 'danger' as const;
    case 'scaffolding': return 'warning' as const;
    case 'archived': return 'default' as const;
    default: return 'info' as const;
  }
};

export function ServiceCatalogPage() {
  const [search, setSearch] = useState('');

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', search],
    queryFn: () => servicesApi.list(search || undefined),
    refetchInterval: 5000,
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (s: Service) => (
        <Link to={`/services/${s.id}`} className="text-primary-600 hover:underline font-medium">
          {s.name}
        </Link>
      ),
    },
    {
      key: 'template',
      header: 'Template',
      render: (s: Service) => s.template?.name || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: Service) => <Badge variant={statusVariant(s.status)}>{s.status}</Badge>,
    },
    {
      key: 'repo',
      header: 'GitHub Repo',
      render: (s: Service) =>
        s.githubRepoUrl ? (
          <a
            href={s.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline inline-flex items-center gap-1 text-sm"
          >
            {s.githubRepoSlug} <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          '-'
        ),
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (s: Service) => s.createdBy?.displayName || '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (s: Service) => new Date(s.createdAt).toLocaleString(),
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Services</h1>
      </div>
      <div className="max-w-xs">
        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card>
        <Table columns={columns} data={services} emptyMessage="No services yet. Scaffold one from a template!" />
      </Card>
    </div>
  );
}
