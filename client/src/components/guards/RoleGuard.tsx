import { useAuthStore } from '../../stores/auth-store';

interface RoleGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ permission, children, fallback }: RoleGuardProps) {
  const { hasPermission } = useAuthStore();

  if (!hasPermission(permission)) {
    return fallback ? <>{fallback}</> : (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
