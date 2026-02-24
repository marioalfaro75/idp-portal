import api from './client';
import type {
  FederationProviderPublic,
  FederationProviderAdmin,
  FederationProviderDetail,
  CreateFederationProviderRequest,
  UpdateFederationProviderRequest,
} from '@idp/shared';

export const federationApi = {
  /** List enabled providers (public, no auth needed) */
  listEnabled: () =>
    api.get<FederationProviderPublic[]>('/federation/providers').then((r) => r.data),

  /** Get login URL for a provider — returns the redirect URL */
  getLoginUrl: (slug: string) =>
    `/api/federation/${slug}/login`,

  // --- Admin ---

  listAll: () =>
    api.get<FederationProviderAdmin[]>('/federation/admin/providers').then((r) => r.data),

  getById: (id: string) =>
    api.get<FederationProviderDetail>(`/federation/admin/providers/${id}`).then((r) => r.data),

  create: (data: CreateFederationProviderRequest) =>
    api.post<FederationProviderAdmin>('/federation/admin/providers', data).then((r) => r.data),

  update: (id: string, data: UpdateFederationProviderRequest) =>
    api.put<FederationProviderAdmin>(`/federation/admin/providers/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/federation/admin/providers/${id}`).then((r) => r.data),
};
