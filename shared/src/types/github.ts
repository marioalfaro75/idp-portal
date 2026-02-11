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
