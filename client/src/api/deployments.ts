import api from './client';
import type { Deployment, CreateDeploymentRequest } from '@idp/shared';

export const deploymentsApi = {
  list: () => api.get<Deployment[]>('/deployments').then((r) => r.data),
  get: (id: string) => api.get<Deployment>(`/deployments/${id}`).then((r) => r.data),
  create: (data: CreateDeploymentRequest) => api.post<Deployment>('/deployments', data).then((r) => r.data),
  destroy: (id: string) => api.post<Deployment>(`/deployments/${id}/destroy`).then((r) => r.data),
  rollback: (id: string) => api.post<Deployment>(`/deployments/${id}/rollback`).then((r) => r.data),
  cleanupStale: () => api.delete<{ deleted: number }>('/deployments/stale').then((r) => r.data),
  delete: (id: string) => api.delete(`/deployments/${id}`).then((r) => r.data),
  purgeFailed: () => api.delete<{ deleted: number }>('/deployments/failed').then((r) => r.data),
  getLogs: (id: string) => {
    const token = localStorage.getItem('token');
    return new EventSource(`/api/deployments/${id}/logs?token=${token}`);
  },
};
