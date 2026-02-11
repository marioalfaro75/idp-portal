import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../api/templates';

export function useTemplates(params?: { provider?: string; category?: string; search?: string }) {
  return useQuery({
    queryKey: ['templates', params],
    queryFn: () => templatesApi.list(params),
  });
}

export function useTemplate(slug: string | undefined) {
  return useQuery({
    queryKey: ['template', slug],
    queryFn: () => templatesApi.getBySlug(slug!),
    enabled: !!slug,
  });
}
