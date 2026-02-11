import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { rolesApi } from '../../api/roles';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { User } from '@idp/shared';
import { Plus, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', displayName: '', roleId: '' });
  const [loading, setLoading] = useState(false);

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usersApi.create(form);
      toast.success('User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAdd(false);
      setForm({ email: '', password: '', displayName: '', roleId: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await usersApi.update(user.id, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'disabled' : 'enabled'}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await usersApi.delete(id);
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    }
  };

  const columns = [
    { key: 'displayName', header: 'Name', render: (u: User) => <span className="font-medium">{u.displayName}</span> },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u: User) => <Badge>{u.role?.name}</Badge> },
    { key: 'isActive', header: 'Status', render: (u: User) => <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Disabled'}</Badge> },
    { key: 'createdAt', header: 'Created', render: (u: User) => new Date(u.createdAt).toLocaleDateString() },
    {
      key: 'actions', header: '', render: (u: User) => (
        <div className="flex gap-2">
          <button onClick={() => handleToggleActive(u)} className="p-1 hover:bg-gray-100 rounded text-gray-500" title={u.isActive ? 'Disable' : 'Enable'}>
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(u.id)} className="p-1 hover:bg-gray-100 rounded text-red-500" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" /> Add User</Button>
      </div>
      <Card>{isLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> : <Table columns={columns} data={users} />}</Card>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Display Name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <Select label="Role" options={roles.map((r) => ({ value: r.id, label: r.name }))} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
