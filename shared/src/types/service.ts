export type ServiceStatus = 'scaffolding' | 'active' | 'failed' | 'archived';

export type WorkflowRunStatus = 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed';

export type WorkflowTriggerType = 'scaffold' | 'manual' | 'retry';

export interface WorkflowRun {
  id: string;
  serviceId: string;
  githubRunId: string | null;
  githubRunUrl: string | null;
  workflowName: string;
  status: WorkflowRunStatus;
  conclusion: string | null;
  triggerType: WorkflowTriggerType;
  triggeredById: string;
  triggeredBy?: { id: string; displayName: string };
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  status: ServiceStatus;
  templateId: string;
  template?: { id: string; name: string; provider: string; category: string };
  githubRepoUrl: string;
  githubRepoSlug: string;
  parameters: Record<string, string>;
  errorMessage: string | null;
  createdById: string;
  createdBy?: { id: string; displayName: string };
  workflowRuns?: WorkflowRun[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  templateId: string;
  parameters: Record<string, string>;
}

export interface TriggerWorkflowRequest {
  workflowName?: string;
}
