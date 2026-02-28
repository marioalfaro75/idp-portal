export type DeploymentStatus =
  | 'pending'
  | 'planning'
  | 'planned'
  | 'applying'
  | 'succeeded'
  | 'failed'
  | 'destroying'
  | 'destroyed'
  | 'rolling_back'
  | 'rolled_back'
  | 'dispatched'
  | 'running';

export interface Deployment {
  id: string;
  name: string;
  status: DeploymentStatus;
  templateId: string;
  template?: { id: string; name: string; provider: string; category: string };
  cloudConnectionId: string;
  cloudConnection?: { id: string; name: string; provider: string };
  variables: Record<string, string>;
  planOutput: string | null;
  applyOutput: string | null;
  destroyOutput: string | null;
  outputs: Record<string, string> | null;
  scanOutput: string | null;
  errorMessage: string | null;
  executionMethod: 'local' | 'github';
  githubRepo?: string | null;
  githubRunUrl?: string | null;
  createdById: string;
  createdBy?: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeploymentRequest {
  name: string;
  templateId: string;
  cloudConnectionId: string;
  variables: Record<string, string>;
  scanOutput?: string;
  executionMethod: 'local' | 'github';
  githubRepo?: string;
  githubWorkflowId?: string;
  githubRef?: string;
}

export interface DeploymentLogEvent {
  type: 'log' | 'status' | 'error' | 'warning' | 'complete';
  message: string;
  timestamp: string;
}
