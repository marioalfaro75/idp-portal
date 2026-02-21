import { LogOut, User, Sun, Moon, Monitor } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useUiStore } from '../../stores/ui-store';
import { authApi } from '../../api/auth';
import { useNavigate } from 'react-router-dom';

export function TopBar() {
  const { user, clearAuth } = useAuthStore();
  const { theme, setTheme } = useUiStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const themeLabel = theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System theme';

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={cycleTheme}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title={themeLabel}
        >
          <ThemeIcon className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="font-medium">{user?.displayName}</span>
          <span className="text-gray-400 dark:text-gray-500">({user?.role?.name})</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
