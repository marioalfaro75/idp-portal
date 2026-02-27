export interface GitHubAppStatus {
  configured: boolean;
  appId?: string;
  installationId?: string;
  owner?: string | null;
}

export interface GitHubAppTestResult {
  valid: boolean;
  message: string;
  owner?: string;
  permissions?: Record<string, string>;
}

export interface SaveGitHubAppConfigRequest {
  appId: string;
  installationId: string;
  privateKey: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  language: string | null;
  updatedAt: string | null;
}

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
}

export interface DispatchWorkflowRequest {
  owner: string;
  repo: string;
  workflowId: number;
  ref: string;
  inputs?: Record<string, string>;
}
