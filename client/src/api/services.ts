import api from './client';
import type { Service, WorkflowRun, CreateServiceRequest, TriggerWorkflowRequest } from '@idp/shared';

export const servicesApi = {
  list: (search?: string) =>
    api.get<Service[]>('/services', { params: search ? { search } : undefined }).then((r) => r.data),
  get: (id: string) =>
    api.get<Service>(`/services/${id}`).then((r) => r.data),
  create: (data: CreateServiceRequest) =>
    api.post<Service>('/services', data).then((r) => r.data),
  triggerWorkflow: (id: string, data?: TriggerWorkflowRequest) =>
    api.post<WorkflowRun>(`/services/${id}/trigger`, data || {}).then((r) => r.data),
  retryWorkflow: (serviceId: string, runId: string) =>
    api.post<WorkflowRun>(`/services/${serviceId}/runs/${runId}/retry`).then((r) => r.data),
};
