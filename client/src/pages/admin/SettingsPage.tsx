import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/settings';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

const OIDC_KEYS = ['oidc.tenantId', 'oidc.clientId', 'oidc.clientSecret', 'oidc.redirectUri'];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings = {}, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.getAll });
  const [oidcForm, setOidcForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSaveOidc = async () => {
    setSaving(true);
    try {
      for (const key of OIDC_KEYS) {
        if (oidcForm[key] !== undefined) {
          await settingsApi.set(key, oidcForm[key]);
        }
      }
      toast.success('OIDC settings saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card title="Azure AD OIDC Configuration">
        <div className="space-y-4 max-w-lg">
          <Input label="Tenant ID" value={oidcForm['oidc.tenantId'] ?? settings['oidc.tenantId'] ?? ''} onChange={(e) => setOidcForm({ ...oidcForm, 'oidc.tenantId': e.target.value })} />
          <Input label="Client ID" value={oidcForm['oidc.clientId'] ?? settings['oidc.clientId'] ?? ''} onChange={(e) => setOidcForm({ ...oidcForm, 'oidc.clientId': e.target.value })} />
          <Input label="Client Secret" type="password" value={oidcForm['oidc.clientSecret'] ?? settings['oidc.clientSecret'] ?? ''} onChange={(e) => setOidcForm({ ...oidcForm, 'oidc.clientSecret': e.target.value })} />
          <Input label="Redirect URI" value={oidcForm['oidc.redirectUri'] ?? settings['oidc.redirectUri'] ?? 'http://localhost:3001/api/auth/oidc/callback'} onChange={(e) => setOidcForm({ ...oidcForm, 'oidc.redirectUri': e.target.value })} />
          <Button onClick={handleSaveOidc} loading={saving}>Save OIDC Settings</Button>
        </div>
      </Card>

      <Card title="System Info">
        <dl className="space-y-2">
          {Object.entries(settings).filter(([k]) => !k.startsWith('oidc.')).map(([key, value]) => (
            <div key={key} className="flex gap-4">
              <dt className="text-sm font-medium text-gray-500 w-48">{key}</dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
