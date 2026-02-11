import type { CloudProvider } from '../types/cloud-connection';
import type { TemplateCategory } from '../types/template';

export const CLOUD_PROVIDERS: { value: CloudProvider; label: string; color: string }[] = [
  { value: 'aws', label: 'Amazon Web Services', color: '#FF9900' },
  { value: 'gcp', label: 'Google Cloud Platform', color: '#4285F4' },
  { value: 'azure', label: 'Microsoft Azure', color: '#0078D4' },
];

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string; icon: string }[] = [
  { value: 'networking', label: 'Networking', icon: 'network' },
  { value: 'compute', label: 'Compute', icon: 'cpu' },
  { value: 'serverless', label: 'Serverless', icon: 'zap' },
  { value: 'databases', label: 'Databases', icon: 'database' },
  { value: 'storage', label: 'Storage', icon: 'hard-drive' },
  { value: 'security', label: 'Security', icon: 'shield' },
  { value: 'monitoring', label: 'Monitoring', icon: 'activity' },
  { value: 'cicd', label: 'CI/CD', icon: 'git-branch' },
  { value: 'containers', label: 'Containers', icon: 'box' },
  { value: 'messaging', label: 'Messaging', icon: 'mail' },
];

export const DEPLOYMENT_STATUSES = [
  'pending',
  'planning',
  'planned',
  'applying',
  'succeeded',
  'failed',
  'destroying',
  'destroyed',
] as const;
