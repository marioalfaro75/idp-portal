import api from './client';
import type { GitHubConnection, CreateGitHubConnectionRequest, GitHubRepo, GitHubWorkflow, DispatchWorkflowRequest, GitHubConnectionTestResult, GitHubConnectionUsage } from '@idp/shared';

export const githubApi = {
  getConnection: () => api.get<GitHubConnection>('/github/connection').then((r) => r.data),
  connect: (data: CreateGitHubConnectionRequest) => api.post<GitHubConnection>('/github/connection', data).then((r) => r.data),
  disconnect: () => api.delete('/github/connection').then((r) => r.data),
  testConnection: () => api.get<GitHubConnectionTestResult>('/github/connection/test').then((r) => r.data),
  updateToken: (data: CreateGitHubConnectionRequest) => api.patch<GitHubConnection>('/github/connection', data).then((r) => r.data),
  getUsage: () => api.get<GitHubConnectionUsage>('/github/usage').then((r) => r.data),
  listRepos: () => api.get<GitHubRepo[]>('/github/repos').then((r) => r.data),
  listWorkflows: (owner: string, repo: string) =>
    api.get<GitHubWorkflow[]>(`/github/repos/${owner}/${repo}/workflows`).then((r) => r.data),
  dispatchWorkflow: (data: DispatchWorkflowRequest) => api.post('/github/dispatch', data).then((r) => r.data),
};
