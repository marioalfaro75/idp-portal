import api from './client';
import type { SecurityScanResult, SecurityConfig, SecurityToolStatus } from '@idp/shared';

export const securityApi = {
  scan: (templateId: string, variables?: Record<string, string>) =>
    api.post<SecurityScanResult>('/security/scan', { templateId, variables }).then((r) => r.data),

  getConfig: () =>
    api.get<SecurityConfig>('/security/config').then((r) => r.data),

  updateConfig: (data: Partial<SecurityConfig>) =>
    api.put<SecurityConfig>('/security/config', data).then((r) => r.data),

  getToolsStatus: () =>
    api.get<SecurityToolStatus[]>('/security/tools/status').then((r) => r.data),

  installTool: (tool: 'trivy' | 'tflint' | 'conftest') =>
    api.post<SecurityToolStatus>(`/security/tools/${tool}/install`).then((r) => r.data),
};
