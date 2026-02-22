import api from './client';
import type { Template } from '@idp/shared';

export const templatesApi = {
  list: (params?: { provider?: string; category?: string; search?: string }) =>
    api.get<Template[]>('/templates', { params }).then((r) => r.data),
  get: (id: string) => api.get<Template>(`/templates/${id}`).then((r) => r.data),
  getBySlug: (slug: string) => api.get<Template>(`/templates/slug/${slug}`).then((r) => r.data),
  sync: () => api.post<{ count: number }>('/templates/sync').then((r) => r.data),
  updateTags: (id: string, tags: string[]) =>
    api.patch<Template>(`/templates/${id}/tags`, { tags }).then((r) => r.data),
};
