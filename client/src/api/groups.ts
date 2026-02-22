import api from './client';
import type { Group, CreateGroupRequest, UpdateGroupRequest, UpdateGroupMembersRequest, UpdateGroupTemplatesRequest } from '@idp/shared';

export const groupsApi = {
  list: () => api.get<Group[]>('/groups').then((r) => r.data),
  get: (id: string) => api.get<Group>(`/groups/${id}`).then((r) => r.data),
  create: (data: CreateGroupRequest) => api.post<Group>('/groups', data).then((r) => r.data),
  update: (id: string, data: UpdateGroupRequest) => api.put<Group>(`/groups/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/groups/${id}`).then((r) => r.data),
  setMembers: (id: string, data: UpdateGroupMembersRequest) => api.put<Group>(`/groups/${id}/members`, data).then((r) => r.data),
  setTemplates: (id: string, data: UpdateGroupTemplatesRequest) => api.put<Group>(`/groups/${id}/templates`, data).then((r) => r.data),
};
