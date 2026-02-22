import { useQuery } from '@tanstack/react-query';
import { deploymentsApi } from '../api/deployments';

export function useDeployments() {
  return useQuery({
    queryKey: ['deployments'],
    queryFn: deploymentsApi.list,
    refetchInterval: 5000,
  });
}

export function useDeployment(id: string | undefined) {
  return useQuery({
    queryKey: ['deployment', id],
    queryFn: () => deploymentsApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      return d && ['pending', 'planning', 'applying', 'destroying', 'rolling_back'].includes(d.status) ? 2000 : false;
    },
  });
}
