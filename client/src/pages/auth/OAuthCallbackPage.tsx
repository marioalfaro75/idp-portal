import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import toast from 'react-hot-toast';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      toast.error(error);
      navigate('/login');
      return;
    }

    if (token) {
      // The server returns the full user info as base64-encoded JSON in the 'user' param
      const userParam = params.get('user');
      if (userParam) {
        try {
          const user = JSON.parse(atob(userParam));
          setAuth(user, token);
          toast.success('Signed in successfully!');
          navigate('/');
          return;
        } catch {}
      }
      // Fallback: store token and let AuthGuard fetch user
      localStorage.setItem('token', token);
      navigate('/');
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
}
