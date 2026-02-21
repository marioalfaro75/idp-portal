import { useQuery } from '@tanstack/react-query';
import { deploymentsApi } from '../../api/deployments';
import { templatesApi } from '../../api/templates';
import { cloudConnectionsApi } from '../../api/cloud-connections';
import { servicesApi } from '../../api/services';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Rocket, Layers, Cloud, Box } from 'lucide-react';
import { Link } from 'react-router-dom';

const deploymentStatusVariant = (status: string) => {
  switch (status) {
    case 'succeeded': return 'success' as const;
    case 'failed': return 'danger' as const;
    case 'applying': case 'planning': return 'warning' as const;
    case 'destroyed': return 'default' as const;
    default: return 'info' as const;
  }
};

const serviceStatusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'success' as const;
    case 'failed': return 'danger' as const;
    case 'scaffolding': return 'warning' as const;
    case 'archived': return 'default' as const;
    default: return 'info' as const;
  }
};

export function DashboardPage() {
  const { data: deployments = [] } = useQuery({ queryKey: ['deployments'], queryFn: deploymentsApi.list });
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.list() });
  const { data: connections = [] } = useQuery({ queryKey: ['cloudConnections'], queryFn: cloudConnectionsApi.list });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.list() });

  const stats = [
    { label: 'Templates', value: templates.length, icon: Layers, color: 'text-blue-600 bg-blue-100', to: '/templates' },
    { label: 'Services', value: services.length, icon: Box, color: 'text-green-600 bg-green-100', to: '/services' },
    { label: 'Cloud Connections', value: connections.length, icon: Cloud, color: 'text-purple-600 bg-purple-100', to: '/cloud-connections' },
    { label: 'Active', value: services.filter((s) => s.status === 'active').length, icon: Rocket, color: 'text-emerald-600 bg-emerald-100', to: '/services' },
  ];

  const recentServices = services.slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to}>
            <Card className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card title="Recent Services">
        {recentServices.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No services yet</p>
        ) : (
          <div className="divide-y">
            {recentServices.map((s) => (
              <Link key={s.id} to={`/services/${s.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.template?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={serviceStatusVariant(s.status)}>{s.status}</Badge>
                  <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
