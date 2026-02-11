import api from './client';
import type { Role, CreateRoleRequest, UpdateRoleRequest } from '@idp/shared';

export const rolesApi = {
  list: () => api.get<Role[]>('/roles').then((r) => r.data),
  get: (id: string) => api.get<Role>(`/roles/${id}`).then((r) => r.data),
  create: (data: CreateRoleRequest) => api.post<Role>('/roles', data).then((r) => r.data),
  update: (id: string, data: UpdateRoleRequest) => api.put<Role>(`/roles/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/roles/${id}`).then((r) => r.data),
};
