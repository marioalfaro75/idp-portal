import api from './client';
import type { GitHubAppStatus, GitHubAppTestResult, SaveGitHubAppConfigRequest, GitHubRepo, GitHubWorkflow, DispatchWorkflowRequest } from '@idp/shared';

export const githubApi = {
  getStatus: () => api.get<GitHubAppStatus>('/github/status').then((r) => r.data),
  saveConfig: (data: SaveGitHubAppConfigRequest) => api.post('/github/app/config', data).then((r) => r.data),
  removeConfig: () => api.delete('/github/app/config').then((r) => r.data),
  testConnection: () => api.get<GitHubAppTestResult>('/github/app/test').then((r) => r.data),
  listRepos: () => api.get<GitHubRepo[]>('/github/repos').then((r) => r.data),
  listWorkflows: (owner: string, repo: string) =>
    api.get<GitHubWorkflow[]>(`/github/repos/${owner}/${repo}/workflows`).then((r) => r.data),
  dispatchWorkflow: (data: DispatchWorkflowRequest) => api.post('/github/dispatch', data).then((r) => r.data),
};
