import type { CloudProvider } from './cloud-connection';

export type TemplateCategory =
  | 'networking'
  | 'compute'
  | 'serverless'
  | 'databases'
  | 'storage'
  | 'security'
  | 'monitoring'
  | 'cicd'
  | 'containers'
  | 'messaging';

export interface TemplateVariable {
  name: string;
  type: string;
  description: string;
  default?: string;
  required: boolean;
  validation?: string;
}

export interface TemplateOutput {
  name: string;
  description: string;
}

export interface TemplateMetadata {
  name: string;
  description: string;
  provider: CloudProvider;
  category: TemplateCategory;
  version: string;
  tags: string[];
  workflow?: string;
}

export interface Template {
  id: string;
  slug: string;
  name: string;
  description: string;
  provider: CloudProvider;
  category: TemplateCategory;
  version: string;
  templatePath: string;
  variables: TemplateVariable[];
  outputs: TemplateOutput[];
  tags: string[];
  workflow: string | null;
  hasScaffold: boolean;
  createdAt: string;
  updatedAt: string;
}
