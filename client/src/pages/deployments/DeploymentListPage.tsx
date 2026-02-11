import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deploymentsApi } from '../../api/deployments';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { Deployment } from '@idp/shared';

const statusVariant = (status: string) => {
  switch (status) {
    case 'succeeded': return 'success' as const;
    case 'failed': return 'danger' as const;
    case 'applying': case 'planning': case 'destroying': return 'warning' as const;
    case 'destroyed': return 'default' as const;
    default: return 'info' as const;
  }
};

export function DeploymentListPage() {
  const { data: deployments = [], isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: deploymentsApi.list,
    refetchInterval: 5000,
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (d: Deployment) => (
        <Link to={`/deployments/${d.id}`} className="text-primary-600 hover:underline font-medium">
          {d.name}
        </Link>
      ),
    },
    {
      key: 'template',
      header: 'Template',
      render: (d: Deployment) => d.template?.name || '-',
    },
    {
      key: 'cloudConnection',
      header: 'Connection',
      render: (d: Deployment) => d.cloudConnection?.name || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (d: Deployment) => <Badge variant={statusVariant(d.status)}>{d.status}</Badge>,
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (d: Deployment) => d.createdBy?.displayName || '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (d: Deployment) => new Date(d.createdAt).toLocaleString(),
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Deployments</h1>
      <Card>
        <Table columns={columns} data={deployments} emptyMessage="No deployments yet" />
      </Card>
    </div>
  );
}
