import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { authApi } from '../../api/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      try {
        const { setupComplete } = await authApi.getSetupStatus();
        setSetupComplete(setupComplete);

        if (isAuthenticated && !user) {
          const me = await authApi.getMe();
          const token = localStorage.getItem('token')!;
          setAuth(me, token);
        }
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (setupComplete === false && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/setup') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
