import { useQuery } from '@tanstack/react-query';
import { deploymentsApi } from '../../api/deployments';
import { templatesApi } from '../../api/templates';
import { cloudConnectionsApi } from '../../api/cloud-connections';
import { servicesApi } from '../../api/services';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Rocket, Layers, Cloud, Box, Wrench, ArrowRight } from 'lucide-react';
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

const statusBarColors: Record<string, string> = {
  succeeded: 'bg-green-500',
  failed: 'bg-red-500',
  applying: 'bg-yellow-500',
  planning: 'bg-yellow-500',
  dispatched: 'bg-blue-500',
  running: 'bg-blue-500',
  destroying: 'bg-orange-500',
  destroyed: 'bg-gray-400',
  pending: 'bg-gray-400',
  planned: 'bg-yellow-300',
};

const providerColors: Record<string, string> = {
  aws: 'bg-amber-500',
  azure: 'bg-blue-500',
  gcp: 'bg-red-500',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DashboardPage() {
  const { data: deployments = [] } = useQuery({ queryKey: ['deployments'], queryFn: deploymentsApi.list });
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.list() });
  const { data: connections = [] } = useQuery({ queryKey: ['cloudConnections'], queryFn: cloudConnectionsApi.list });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.list() });

  const activeStatuses = new Set(['pending', 'planning', 'applying', 'running', 'dispatched']);
  const activeDeployments = deployments.filter((d) => activeStatuses.has(d.status));
  const errorConnections = connections.filter((c) => c.status === 'error');
  const activeServices = services.filter((s) => s.status === 'active');
  const distinctProviders = new Set(templates.map((t) => t.provider));

  // Status breakdown counts
  const statusCounts: Record<string, number> = {};
  for (const d of deployments) {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
  }

  // Provider distribution from deployments
  const providerCounts: Record<string, number> = {};
  for (const d of deployments) {
    const provider = d.template?.provider || d.cloudConnection?.provider;
    if (provider) {
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    }
  }
  const maxProviderCount = Math.max(...Object.values(providerCounts), 1);

  // Recent activity feed (combined deployments + services)
  const activityItems = [
    ...deployments.map((d) => ({
      type: 'deployment' as const,
      id: d.id,
      name: d.name,
      status: d.status,
      statusVariant: deploymentStatusVariant(d.status),
      link: `/deployments/${d.id}`,
      createdAt: d.createdAt,
    })),
    ...services.map((s) => ({
      type: 'service' as const,
      id: s.id,
      name: s.name,
      status: s.status,
      statusVariant: serviceStatusVariant(s.status),
      link: `/services/${s.id}`,
      createdAt: s.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const recentDeployments = [...deployments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const recentServices = [...services]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    {
      label: 'Deployments',
      value: deployments.length,
      secondary: `${activeDeployments.length} active`,
      secondaryColor: 'text-gray-500 dark:text-gray-400',
      icon: Rocket,
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/50',
      to: '/deployments',
    },
    {
      label: 'Templates',
      value: templates.length,
      secondary: `${distinctProviders.size} provider${distinctProviders.size !== 1 ? 's' : ''}`,
      secondaryColor: 'text-gray-500 dark:text-gray-400',
      icon: Layers,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50',
      to: '/templates',
    },
    {
      label: 'Services',
      value: services.length,
      secondary: `${activeServices.length} active`,
      secondaryColor: 'text-gray-500 dark:text-gray-400',
      icon: Box,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/50',
      to: '/services',
    },
    {
      label: 'Connections',
      value: connections.length,
      secondary: errorConnections.length > 0 ? `${errorConnections.length} error${errorConnections.length !== 1 ? 's' : ''}` : 'All healthy',
      secondaryColor: errorConnections.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      icon: Cloud,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/50',
      to: '/cloud-connections',
    },
  ];

  const statusOrder = ['succeeded', 'failed', 'applying', 'planning', 'dispatched', 'running', 'destroying', 'destroyed', 'pending', 'planned'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link to="/templates">
            <Button variant="secondary" size="sm">
              <Rocket className="w-4 h-4 mr-1.5" />
              Deploy
            </Button>
          </Link>
          <Link to="/templates">
            <Button variant="secondary" size="sm">
              <Wrench className="w-4 h-4 mr-1.5" />
              Scaffold
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
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
                  <p className={`text-xs ${stat.secondaryColor}`}>{stat.secondary}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Deployment Status Breakdown */}
      <Card title="Deployment Status">
        {deployments.length === 0 ? (
          <div>
            <div className="h-4 rounded-full bg-gray-200 dark:bg-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-3">No deployments yet</p>
          </div>
        ) : (
          <div>
            <div className="flex h-4 rounded-full overflow-hidden">
              {statusOrder.map((status) => {
                const count = statusCounts[status];
                if (!count) return null;
                return (
                  <div
                    key={status}
                    className={`${statusBarColors[status]} transition-all`}
                    style={{ width: `${(count / deployments.length) * 100}%` }}
                    title={`${status}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {statusOrder.map((status) => {
                const count = statusCounts[status];
                if (!count) return null;
                return (
                  <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusBarColors[status]}`} />
                    <span className="capitalize">{status}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Provider Distribution + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Provider Distribution">
          {Object.keys(providerCounts).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No deployment data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(providerCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([provider, count]) => (
                  <div key={provider} className="flex items-center gap-3">
                    <span className="text-sm font-medium uppercase w-12 text-gray-700 dark:text-gray-300">{provider}</span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className={`h-full rounded ${providerColors[provider] || 'bg-gray-500'} transition-all`}
                        style={{ width: `${(count / maxProviderCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right text-gray-600 dark:text-gray-400">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card title="Recent Activity">
          {activityItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No activity yet</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {activityItems.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.link}
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 -mx-2 rounded"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.type === 'deployment' ? 'bg-orange-500' : 'bg-green-500'}`} />
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                    <Badge variant={item.statusVariant}>{item.status}</Badge>
                    <span className="text-xs text-gray-400 w-14 text-right">{timeAgo(item.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Deployments + Recent Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Recent Deployments"
          actions={
            <Link to="/deployments" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {recentDeployments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No deployments yet</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentDeployments.map((d) => (
                <Link
                  key={d.id}
                  to={`/deployments/${d.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 -mx-2 rounded"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{d.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.template?.name}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                    <Badge variant={deploymentStatusVariant(d.status)}>{d.status}</Badge>
                    <span className="text-xs text-gray-400 w-14 text-right">{timeAgo(d.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Recent Services"
          actions={
            <Link to="/services" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {recentServices.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No services yet</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentServices.map((s) => (
                <Link
                  key={s.id}
                  to={`/services/${s.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 -mx-2 rounded"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.template?.name}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                    <Badge variant={serviceStatusVariant(s.status)}>{s.status}</Badge>
                    <span className="text-xs text-gray-400 w-14 text-right">{timeAgo(s.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
