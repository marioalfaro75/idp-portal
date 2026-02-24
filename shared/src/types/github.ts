export interface GitHubConnection {
  id: string;
  username: string;
  scopes: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGitHubConnectionRequest {
  token: string;
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

export interface GitHubConnectionTestResult {
  valid: boolean;
  message: string;
  username?: string;
  scopes?: string[];
}

export interface GitHubConnectionUsage {
  deployments: {
    total: number;
    active: number;
    items: Array<{ id: string; name: string; status: string; githubRepo: string | null; createdAt: string }>;
  };
  services: {
    total: number;
    active: number;
    items: Array<{ id: string; name: string; slug: string; status: string; githubRepoSlug: string; createdAt: string }>;
  };
  activeRepoSlugs: string[];
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
