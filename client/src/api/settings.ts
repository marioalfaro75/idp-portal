import api from './client';

export const settingsApi = {
  getAll: () => api.get<Record<string, string>>('/settings').then((r) => r.data),
  set: (key: string, value: string) => api.put(`/settings/${key}`, { value }).then((r) => r.data),
  delete: (key: string) => api.delete(`/settings/${key}`).then((r) => r.data),
};
