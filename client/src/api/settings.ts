import api from './client';

export interface TerraformStatus {
  available: boolean;
  version?: string;
  binaryPath: string;
  source: 'system-setting' | 'env-var' | 'default';
}

export const settingsApi = {
  getAll: () => api.get<Record<string, string>>('/settings').then((r) => r.data),
  set: (key: string, value: string) => api.put(`/settings/${key}`, { value }).then((r) => r.data),
  delete: (key: string) => api.delete(`/settings/${key}`).then((r) => r.data),

  terraformStatus: () => api.get<TerraformStatus>('/settings/terraform/status').then((r) => r.data),
  terraformVersions: () => api.get<{ versions: string[] }>('/settings/terraform/versions').then((r) => r.data),
  terraformInstall: (version: string) => api.post<TerraformStatus>('/settings/terraform/install', { version }).then((r) => r.data),
  terraformSetPath: (path: string) => api.put<TerraformStatus>('/settings/terraform/path', { path }).then((r) => r.data),
};
