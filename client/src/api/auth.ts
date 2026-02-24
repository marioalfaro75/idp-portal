import api from './client';
import type { AuthResponse, LoginRequest, SetupRequest, AuthUser } from '@idp/shared';

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  setup: (data: SetupRequest) => api.post<AuthResponse>('/auth/setup', data).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  getMe: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
  getSetupStatus: () => api.get<{ setupComplete: boolean }>('/auth/setup-status').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
};
