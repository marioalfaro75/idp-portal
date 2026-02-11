import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/auth-store';

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setupStatus'],
    queryFn: authApi.getSetupStatus,
    staleTime: 60000,
  });
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
}
