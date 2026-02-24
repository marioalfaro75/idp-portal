import api from './client';
import type { User, CreateUserRequest, UpdateUserRequest } from '@idp/shared';

export const usersApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),
  get: (id: string) => api.get<User>(`/users/${id}`).then((r) => r.data),
  create: (data: CreateUserRequest) => api.post<User>('/users', data).then((r) => r.data),
  update: (id: string, data: UpdateUserRequest) => api.put<User>(`/users/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
  setGroups: (id: string, groupIds: string[]) => api.put<User>(`/users/${id}/groups`, { groupIds }).then((r) => r.data),
  updateProfile: (data: { displayName: string }) => api.patch<User>('/users/me', data).then((r) => r.data),
};
