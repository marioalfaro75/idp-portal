import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../../api/groups';
import { usersApi } from '../../api/users';
import { templatesApi } from '../../api/templates';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import type { Group } from '@idp/shared';
import { Plus, Trash2, Edit, Users, Layers, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  provider: string;
  category: string;
}

export function GroupsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [membersGroup, setMembersGroup] = useState<Group | null>(null);
  const [templatesGroup, setTemplatesGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState('');

  const { data: groups = [], isLoading } = useQuery({ queryKey: ['groups'], queryFn: groupsApi.list });

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)
    );
  }, [groups, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await groupsApi.create(form);
      toast.success('Group created');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (group: Group) => {
    setEditGroup(group);
    setEditForm({ name: group.name, description: group.description });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroup) return;
    setLoading(true);
    try {
      await groupsApi.update(editGroup.id, editForm);
      toast.success('Group updated');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setEditGroup(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this group? Members and template assignments will be removed.')) return;
    try {
      await groupsApi.delete(id);
      toast.success('Group deleted');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    }
  };

  const columns = [
    { key: 'name', header: 'Name', render: (g: Group) => <span className="font-medium">{g.name}</span> },
    { key: 'description', header: 'Description', render: (g: Group) => <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs block">{g.description || '—'}</span> },
    { key: 'members', header: 'Members', render: (g: Group) => <Badge variant="info">{g._count?.members ?? 0}</Badge> },
    { key: 'templates', header: 'Templates', render: (g: Group) => <Badge>{g._count?.templates ?? 0}</Badge> },
    {
      key: 'actions', header: '', render: (g: Group) => (
        <div className="flex gap-2">
          <button onClick={() => setMembersGroup(g)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500" title="Manage members">
            <Users className="w-4 h-4" />
          </button>
          <button onClick={() => setTemplatesGroup(g)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-purple-500" title="Manage templates">
            <Layers className="w-4 h-4" />
          </button>
          <button onClick={() => handleEdit(g)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Edit group">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(g.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Create Group</Button>
      </div>
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
              placeholder="Search by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> : <Table columns={columns} data={filteredGroups} />}
      </Card>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Group">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={100} />
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editGroup} onClose={() => setEditGroup(null)} title="Edit Group">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required minLength={2} maxLength={100} />
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setEditGroup(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* Manage Members Modal */}
      {membersGroup && (
        <ManageMembersModal
          group={membersGroup}
          onClose={() => setMembersGroup(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setMembersGroup(null);
          }}
        />
      )}

      {/* Manage Templates Modal */}
      {templatesGroup && (
        <ManageTemplatesModal
          group={templatesGroup}
          onClose={() => setTemplatesGroup(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setTemplatesGroup(null);
          }}
        />
      )}
    </div>
  );
}

function ManageMembersModal({ group, onClose, onSaved }: { group: Group; onClose: () => void; onSaved: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: allUsers = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const { data: groupDetail } = useQuery({
    queryKey: ['groups', group.id],
    queryFn: () => groupsApi.get(group.id),
  });

  // Initialize selected once group detail loads
  if (groupDetail && !loaded) {
    setSelected(new Set(groupDetail.members?.map((m) => m.userId) || []));
    setLoaded(true);
  }

  const filtered = allUsers.filter(
    (u) => u.displayName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await groupsApi.setMembers(group.id, { userIds: [...selected] });
      toast.success('Members updated');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Manage Members — ${group.name}`} size="lg">
      <div className="space-y-4">
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-80 overflow-y-auto table-scroll border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
          {filtered.map((u) => (
            <label key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{u.displayName}</div>
                <div className="text-xs text-gray-500 truncate">{u.email}</div>
              </div>
            </label>
          ))}
          {filtered.length === 0 && <div className="px-4 py-6 text-center text-gray-500 text-sm">No users found</div>}
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">{selected.size} selected</span>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ManageTemplatesModal({ group, onClose, onSaved }: { group: Group; onClose: () => void; onSaved: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: allTemplates = [] } = useQuery<Template[]>({ queryKey: ['templates'], queryFn: () => templatesApi.list() });
  const { data: groupDetail } = useQuery({
    queryKey: ['groups', group.id],
    queryFn: () => groupsApi.get(group.id),
  });

  if (groupDetail && !loaded) {
    setSelected(new Set(groupDetail.templates?.map((t) => t.templateId) || []));
    setLoaded(true);
  }

  const filtered = allTemplates.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (templateId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  };

  const providerColor = (p: string) => {
    if (p === 'aws') return 'warning';
    if (p === 'azure') return 'info';
    if (p === 'gcp') return 'danger';
    return 'default' as const;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await groupsApi.setTemplates(group.id, { templateIds: [...selected] });
      toast.success('Templates updated');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Manage Templates — ${group.name}`} size="lg">
      <div className="space-y-4">
        <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-80 overflow-y-auto table-scroll border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
          {filtered.map((t) => (
            <label key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <div className="min-w-0 flex items-center gap-2">
                <span className="font-medium text-sm truncate">{t.name}</span>
                <Badge variant={providerColor(t.provider)}>{t.provider.toUpperCase()}</Badge>
                <Badge>{t.category}</Badge>
              </div>
            </label>
          ))}
          {filtered.length === 0 && <div className="px-4 py-6 text-center text-gray-500 text-sm">No templates found</div>}
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">{selected.size} selected</span>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
