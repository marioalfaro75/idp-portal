import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { rolesApi } from '../../api/roles';
import { groupsApi } from '../../api/groups';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { User } from '@idp/shared';
import { Plus, Trash2, Edit, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', displayName: '', roleId: '' });
  const [formGroupIds, setFormGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', email: '', roleId: '', isActive: true, password: '' });
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: groupsApi.list });

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (q && !u.displayName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter && u.role?.id !== roleFilter) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'disabled' && u.isActive) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await usersApi.create(form);
      if (formGroupIds.length > 0) {
        await usersApi.setGroups(created.id, formGroupIds);
      }
      toast.success('User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAdd(false);
      setForm({ email: '', password: '', displayName: '', roleId: '' });
      setFormGroupIds([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditUser(user);
    setEditForm({
      displayName: user.displayName,
      email: user.email,
      roleId: user.role?.id || '',
      isActive: user.isActive,
      password: '',
    });
    setEditGroupIds(user.groups?.map((g) => g.id) || []);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        displayName: editForm.displayName,
        email: editForm.email,
        roleId: editForm.roleId,
        isActive: editForm.isActive,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await usersApi.update(editUser.id, payload);
      await usersApi.setGroups(editUser.id, editGroupIds);
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setLoading(false);
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
    { key: 'groups', header: 'Groups', render: (u: User) => u.groups && u.groups.length > 0
      ? <div className="flex flex-wrap gap-1">{u.groups.map((g) => <Badge key={g.id} variant="info">{g.name}</Badge>)}</div>
      : <span className="text-gray-400 text-sm">—</span>
    },
    { key: 'isActive', header: 'Status', render: (u: User) => <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Disabled'}</Badge> },
    { key: 'createdAt', header: 'Created', render: (u: User) => new Date(u.createdAt).toLocaleDateString() },
    {
      key: 'actions', header: '', render: (u: User) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(u)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Edit user">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(u.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500" title="Delete">
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
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select options={roles.map((r) => ({ value: r.id, label: r.name }))} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-48" />
          <Select options={[{ value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48" />
        </div>
        {isLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> : <Table columns={columns} data={filteredUsers} />}
      </Card>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Display Name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <Select label="Role" options={roles.map((r) => ({ value: r.id, label: r.name }))} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} />
          {groups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Groups</label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto table-scroll space-y-2">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formGroupIds.includes(g.id)}
                      onChange={(e) => setFormGroupIds(e.target.checked ? [...formGroupIds, g.id] : formGroupIds.filter((id) => id !== g.id))}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{g.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input label="Display Name" value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} required />
          <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
          <Select label="Role" options={roles.map((r) => ({ value: r.id, label: r.name }))} value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })} />
          <Select label="Status" options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Disabled' }]} value={String(editForm.isActive)} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })} />
          <Input label="New Password" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} minLength={8} placeholder="Leave blank to keep current" />
          {groups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Groups</label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto table-scroll space-y-2">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editGroupIds.includes(g.id)}
                      onChange={(e) => setEditGroupIds(e.target.checked ? [...editGroupIds, g.id] : editGroupIds.filter((id) => id !== g.id))}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{g.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
