import api from './client';
import type { UpdateCheckResult } from '@idp/shared';

export const updatesApi = {
  check: () => api.get<UpdateCheckResult>('/updates/check').then((r) => r.data),
};
