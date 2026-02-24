import { useState } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { useUiStore } from '../../stores/ui-store';
import { usersApi } from '../../api/users';
import { authApi } from '../../api/auth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

type Theme = 'light' | 'dark' | 'system';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Settings</h1>
      <ProfileSection />
      <PasswordSection />
      <AppearanceSection />
      <SidebarSection />
    </div>
  );
}

function ProfileSection() {
  const { user, setAuth, token } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateProfile({ displayName });
      if (user && token) {
        setAuth({ ...user, displayName }, token);
      }
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Profile">
      <div className="space-y-4 max-w-lg">
        <Input label="Email" value={user?.email ?? ''} disabled />
        <Input label="Role" value={user?.role?.name ?? ''} disabled />
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Button onClick={handleSave} loading={saving} disabled={displayName.length < 2}>
          Save Profile
        </Button>
      </div>
    </Card>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Change Password">
      <div className="space-y-4 max-w-lg">
        <Input
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Minimum 8 characters"
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmPassword.length > 0 && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
        />
        <Button onClick={handleSave} loading={saving} disabled={!canSubmit}>
          Change Password
        </Button>
      </div>
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useUiStore();

  const themes: { value: Theme; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  return (
    <Card title="Appearance">
      <div className="space-y-3 max-w-lg">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
        <div className="flex gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                theme === t.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function SidebarSection() {
  const { setMenuOrder, menuOrder } = useUiStore();

  const handleReset = () => {
    setMenuOrder([]);
    toast.success('Menu order reset to defaults');
  };

  return (
    <Card title="Sidebar">
      <div className="space-y-3 max-w-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Reset the sidebar menu order to its default arrangement.
        </p>
        <Button variant="secondary" onClick={handleReset} disabled={menuOrder.length === 0}>
          Reset Menu Order
        </Button>
      </div>
    </Card>
  );
}
