import { useQuery } from '@tanstack/react-query';
import { rolesApi } from '../../api/roles';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export function RolesPage() {
  const { data: roles = [], isLoading } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Roles</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.id} title={role.name} actions={role.isSystem ? <Badge variant="info">System</Badge> : undefined}>
            <div className="flex flex-wrap gap-1">
              {role.permissions.map((p: string) => (
                <Badge key={p} variant="default">{p}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
