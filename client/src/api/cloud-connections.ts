import api from './client';
import type { CloudConnection, CreateCloudConnectionRequest, UpdateCloudConnectionRequest } from '@idp/shared';

export const cloudConnectionsApi = {
  list: () => api.get<CloudConnection[]>('/cloud-connections').then((r) => r.data),
  get: (id: string) => api.get<CloudConnection>(`/cloud-connections/${id}`).then((r) => r.data),
  create: (data: CreateCloudConnectionRequest) => api.post<CloudConnection>('/cloud-connections', data).then((r) => r.data),
  update: (id: string, data: UpdateCloudConnectionRequest) => api.put<CloudConnection>(`/cloud-connections/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/cloud-connections/${id}`).then((r) => r.data),
  validate: (id: string) => api.post<{ valid: boolean; message: string }>(`/cloud-connections/${id}/validate`).then((r) => r.data),
};
