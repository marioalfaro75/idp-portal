import api from './client';
import type { HelpArticle } from '@idp/shared';

export const helpApi = {
  getArticles: () => api.get<HelpArticle[]>('/help/articles').then((r) => r.data),
  refresh: () => api.post<HelpArticle[]>('/help/refresh').then((r) => r.data),
};
