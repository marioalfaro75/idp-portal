import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { settingsApi } from '../../api/settings';
import { federationApi } from '../../api/federation';
import { githubApi } from '../../api/github';
import { rolesApi } from '../../api/roles';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { RoleGuard } from '../../components/guards/RoleGuard';
import { PERMISSIONS } from '@idp/shared';
import { Plus, Pencil, Trash2, Copy, Check, RefreshCw, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  FederationProviderAdmin,
  FederationProviderDetail,
  FederationProtocol,
  FederationProviderType,
  CreateFederationProviderRequest,
  OidcConfig,
  SamlConfig,
} from '@idp/shared';

const GITHUB_KEYS = ['github.defaultRepo', 'github.defaultWorkflow', 'github.defaultRef'];

export function PortalAdminPage() {
  return (
    <RoleGuard permission={PERMISSIONS.PORTAL_ADMIN}>
      <PortalAdminContent />
    </RoleGuard>
  );
}

// --- Provider type/protocol helpers ---

const providerTypeOptions = [
  { value: 'azure-ad', label: 'Azure AD' },
  { value: 'google', label: 'Google Workspace' },
  { value: 'okta', label: 'Okta' },
  { value: 'custom', label: 'Custom' },
];

const protocolOptions = [
  { value: 'oidc', label: 'OIDC' },
  { value: 'saml', label: 'SAML' },
];

const issuerPlaceholders: Record<string, string> = {
  'azure-ad': 'https://login.microsoftonline.com/{tenantId}/v2.0',
  'google': 'https://accounts.google.com',
  'okta': 'https://{domain}.okta.com',
  'custom': 'https://idp.example.com',
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// --- Federation Provider Modal ---

interface ProviderFormState {
  name: string;
  slug: string;
  protocol: FederationProtocol;
  providerType: FederationProviderType;
  enabled: boolean;
  autoCreateUsers: boolean;
  defaultRoleId: string;
  // OIDC
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  // SAML
  entryPoint: string;
  issuer: string;
  cert: string;
  wantAuthnResponseSigned: boolean;
  signatureAlgorithm: string;
}

const emptyForm: ProviderFormState = {
  name: '',
  slug: '',
  protocol: 'oidc',
  providerType: 'azure-ad',
  enabled: true,
  autoCreateUsers: true,
  defaultRoleId: '',
  issuerUrl: '',
  clientId: '',
  clientSecret: '',
  scopes: 'openid profile email',
  entryPoint: '',
  issuer: '',
  cert: '',
  wantAuthnResponseSigned: true,
  signatureAlgorithm: 'sha256',
};

function formToRequest(form: ProviderFormState): CreateFederationProviderRequest {
  const base = {
    name: form.name,
    slug: form.slug,
    protocol: form.protocol,
    providerType: form.providerType,
    enabled: form.enabled,
    autoCreateUsers: form.autoCreateUsers,
    defaultRoleId: form.defaultRoleId,
  };
  if (form.protocol === 'oidc') {
    return {
      ...base,
      config: {
        issuerUrl: form.issuerUrl,
        clientId: form.clientId,
        clientSecret: form.clientSecret,
        ...(form.scopes && form.scopes !== 'openid profile email' ? { scopes: form.scopes } : {}),
      } as OidcConfig,
    };
  }
  return {
    ...base,
    config: {
      entryPoint: form.entryPoint,
      issuer: form.issuer,
      cert: form.cert,
      wantAuthnResponseSigned: form.wantAuthnResponseSigned,
      ...(form.signatureAlgorithm !== 'sha256' ? { signatureAlgorithm: form.signatureAlgorithm } : {}),
    } as SamlConfig,
  };
}

function detailToForm(detail: FederationProviderDetail): ProviderFormState {
  const base = {
    name: detail.name,
    slug: detail.slug,
    protocol: detail.protocol,
    providerType: detail.providerType,
    enabled: detail.enabled,
    autoCreateUsers: detail.autoCreateUsers,
    defaultRoleId: detail.defaultRoleId,
  };
  if (detail.protocol === 'oidc') {
    const c = detail.config as OidcConfig;
    return { ...emptyForm, ...base, issuerUrl: c.issuerUrl, clientId: c.clientId, clientSecret: c.clientSecret, scopes: c.scopes || 'openid profile email' };
  }
  const c = detail.config as SamlConfig;
  return { ...emptyForm, ...base, entryPoint: c.entryPoint, issuer: c.issuer, cert: c.cert, wantAuthnResponseSigned: c.wantAuthnResponseSigned ?? true, signatureAlgorithm: c.signatureAlgorithm || 'sha256' };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={handleCopy} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Copy">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
    </button>
  );
}

function ProviderModal({
  open,
  onClose,
  editingId,
}: {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProviderFormState>(emptyForm);
  const [loaded, setLoaded] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });

  // Load existing provider data for editing
  useQuery({
    queryKey: ['federation-provider-detail', editingId],
    queryFn: () => federationApi.getById(editingId!),
    enabled: !!editingId && open,
    onSuccess: (detail: FederationProviderDetail) => {
      if (!loaded) {
        setForm(detailToForm(detail));
        setAutoSlug(false);
        setLoaded(true);
      }
    },
  } as any);

  // Reset when modal opens/closes
  const handleClose = () => {
    setForm(emptyForm);
    setLoaded(false);
    setAutoSlug(true);
    onClose();
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateFederationProviderRequest) => federationApi.create(data),
    onSuccess: () => {
      toast.success('Provider created');
      queryClient.invalidateQueries({ queryKey: ['federation-admin'] });
      handleClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to create provider'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateFederationProviderRequest) => federationApi.update(editingId!, data),
    onSuccess: () => {
      toast.success('Provider updated');
      queryClient.invalidateQueries({ queryKey: ['federation-admin'] });
      handleClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to update provider'),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    const data = formToRequest(form);
    if (editingId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const setField = <K extends keyof ProviderFormState>(key: K, value: ProviderFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && autoSlug) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const serverUrl = window.location.origin.replace(':5173', ':3001');
  const callbackUrl = `${serverUrl}/api/federation/${form.slug || '{slug}'}/callback`;
  const metadataUrl = `${serverUrl}/api/federation/${form.slug || '{slug}'}/metadata`;

  return (
    <Modal open={open} onClose={handleClose} title={editingId ? 'Edit Provider' : 'Add Federation Provider'} size="lg">
      <div className="space-y-4">
        {/* General fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Company Azure AD"
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => { setAutoSlug(false); setField('slug', e.target.value); }}
            placeholder="azure-ad"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Provider Type"
            options={providerTypeOptions}
            value={form.providerType}
            onChange={(e) => setField('providerType', e.target.value as FederationProviderType)}
          />
          <Select
            label="Protocol"
            options={protocolOptions}
            value={form.protocol}
            onChange={(e) => setField('protocol', e.target.value as FederationProtocol)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Default Role"
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
            value={form.defaultRoleId}
            onChange={(e) => setField('defaultRoleId', e.target.value)}
          />
          <div className="space-y-3 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.autoCreateUsers}
                onChange={(e) => setField('autoCreateUsers', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Auto-create users
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setField('enabled', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Enabled
            </label>
          </div>
        </div>

        {/* Protocol-specific fields */}
        <div className="border-t dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {form.protocol === 'oidc' ? 'OIDC Configuration' : 'SAML Configuration'}
          </h4>

          {form.protocol === 'oidc' ? (
            <div className="space-y-3">
              <Input
                label="Issuer URL"
                value={form.issuerUrl}
                onChange={(e) => setField('issuerUrl', e.target.value)}
                placeholder={issuerPlaceholders[form.providerType] || issuerPlaceholders.custom}
              />
              <Input
                label="Client ID"
                value={form.clientId}
                onChange={(e) => setField('clientId', e.target.value)}
              />
              <Input
                label="Client Secret"
                type="password"
                value={form.clientSecret}
                onChange={(e) => setField('clientSecret', e.target.value)}
              />
              <Input
                label="Scopes"
                value={form.scopes}
                onChange={(e) => setField('scopes', e.target.value)}
                placeholder="openid profile email"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                label="Entry Point URL"
                value={form.entryPoint}
                onChange={(e) => setField('entryPoint', e.target.value)}
                placeholder="https://idp.example.com/sso/saml"
              />
              <Input
                label="SP Entity ID / Issuer"
                value={form.issuer}
                onChange={(e) => setField('issuer', e.target.value)}
                placeholder={`${serverUrl}/api/federation/${form.slug || '{slug}'}`}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IdP Certificate</label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100 font-mono"
                  rows={4}
                  value={form.cert}
                  onChange={(e) => setField('cert', e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                />
              </div>
              <Select
                label="Signature Algorithm"
                options={[
                  { value: 'sha256', label: 'SHA-256 (Recommended)' },
                  { value: 'sha512', label: 'SHA-512' },
                  { value: 'sha1', label: 'SHA-1 (Legacy)' },
                ]}
                value={form.signatureAlgorithm}
                onChange={(e) => setField('signatureAlgorithm', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Callback URLs info */}
        {form.slug && (
          <div className="border-t dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URLs to configure in your IdP</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">Callback URL:</span>
                <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs flex-1 truncate">{callbackUrl}</code>
                <CopyButton text={callbackUrl} />
              </div>
              {form.protocol === 'saml' && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">Metadata URL:</span>
                  <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs flex-1 truncate">{metadataUrl}</code>
                  <CopyButton text={metadataUrl} />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            {editingId ? 'Save Changes' : 'Create Provider'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- GitHub App Card ---

function GitHubAppCard() {
  const queryClient = useQueryClient();
  const [appId, setAppId] = useState('');
  const [installationId, setInstallationId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['githubAppStatus'],
    queryFn: githubApi.getStatus,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: () => githubApi.saveConfig({ appId, installationId, privateKey }),
    onSuccess: () => {
      toast.success('GitHub App configured');
      setAppId('');
      setInstallationId('');
      setPrivateKey('');
      setShowSetup(false);
      queryClient.invalidateQueries({ queryKey: ['githubAppStatus'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to save config'),
  });

  const removeMutation = useMutation({
    mutationFn: () => githubApi.removeConfig(),
    onSuccess: () => {
      toast.success('GitHub App removed');
      queryClient.invalidateQueries({ queryKey: ['githubAppStatus'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to remove config'),
  });

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await githubApi.testConnection();
      if (result.valid) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = () => {
    if (confirm('Remove GitHub App configuration? This will disable all GitHub features.')) {
      removeMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Card title="GitHub App">
        <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
      </Card>
    );
  }

  if (status?.configured && !showSetup) {
    return (
      <Card
        title="GitHub App"
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={handleTest} loading={testing}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Test
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowSetup(true)}>
              Reconfigure
            </Button>
            <Button size="sm" variant="danger" onClick={handleRemove}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Connected</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">App ID</span>
              <p className="font-medium">{status.appId}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Installation ID</span>
              <p className="font-medium">{status.installationId}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Organization</span>
              <p className="font-medium">{status.owner || 'N/A'}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="GitHub App">
      <div className="space-y-4 max-w-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure a GitHub App for centralized access to your organization's repositories.
          This replaces individual personal access tokens with short-lived installation tokens.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Setup instructions:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
            <li>Create a GitHub App in your organization settings</li>
            <li>Grant permissions: Contents, Actions, Secrets (R&W), Administration (R&W)</li>
            <li>Generate a private key and install the App on your org</li>
            <li>Enter the App ID, Installation ID, and private key below</li>
          </ol>
        </div>
        <Input
          label="App ID *"
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          placeholder="123456"
        />
        <Input
          label="Installation ID *"
          value={installationId}
          onChange={(e) => setInstallationId(e.target.value)}
          placeholder="12345678"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Private Key *</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100 font-mono"
            rows={6}
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!appId || !installationId || !privateKey}
          >
            Save Configuration
          </Button>
          {showSetup && (
            <Button variant="secondary" onClick={() => setShowSetup(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// --- Main Content ---

function PortalAdminContent() {
  const queryClient = useQueryClient();
  const { data: settings = {}, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.getAll });
  const { data: providers = [], isLoading: loadingProviders } = useQuery({ queryKey: ['federation-admin'], queryFn: federationApi.listAll });
  const [githubForm, setGithubForm] = useState<Record<string, string>>({});
  const [savingGithub, setSavingGithub] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => federationApi.update(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['federation-admin'] }),
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to toggle provider'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => federationApi.remove(id),
    onSuccess: () => {
      toast.success('Provider deleted');
      queryClient.invalidateQueries({ queryKey: ['federation-admin'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to delete provider'),
  });

  const handleSaveGithub = async () => {
    setSavingGithub(true);
    try {
      for (const key of GITHUB_KEYS) {
        if (githubForm[key] !== undefined) {
          await settingsApi.set(key, githubForm[key]);
        }
      }
      toast.success('GitHub Actions defaults saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSavingGithub(false);
    }
  };

  const handleEdit = (provider: FederationProviderAdmin) => {
    setEditingId(provider.id);
    setModalOpen(true);
  };

  const handleDelete = (provider: FederationProviderAdmin) => {
    if (confirm(`Delete federation provider "${provider.name}"?`)) {
      deleteMutation.mutate(provider.id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Portal Administration</h1>

      {/* Federation Providers */}
      <Card title="Federation Providers">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure SSO identity providers (Azure AD, Google, Okta) with OIDC or SAML.
            </p>
            <Button size="sm" onClick={() => { setEditingId(null); setModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Add Provider
            </Button>
          </div>

          {loadingProviders ? (
            <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
          ) : providers.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No federation providers configured.</p>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {providers.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{p.name}</span>
                        <Badge variant={p.protocol === 'oidc' ? 'info' : 'default'}>
                          {p.protocol.toUpperCase()}
                        </Badge>
                        <Badge>{p.providerType}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Default role: {p.defaultRoleName} &middot; Auto-create: {p.autoCreateUsers ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={() => toggleMutation.mutate({ id: p.id, enabled: !p.enabled })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600" />
                    </label>
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <ProviderModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} editingId={editingId} />

      <GitHubAppCard />

      <Card title="GitHub Actions Defaults">
        <div className="space-y-4 max-w-lg">
          <Input
            label="Default Repository"
            placeholder="org/infra-repo"
            value={githubForm['github.defaultRepo'] ?? settings['github.defaultRepo'] ?? ''}
            onChange={(e) => setGithubForm({ ...githubForm, 'github.defaultRepo': e.target.value })}
          />
          <Input
            label="Default Workflow"
            placeholder="deploy.yml"
            value={githubForm['github.defaultWorkflow'] ?? settings['github.defaultWorkflow'] ?? ''}
            onChange={(e) => setGithubForm({ ...githubForm, 'github.defaultWorkflow': e.target.value })}
          />
          <Input
            label="Default Branch"
            placeholder="main"
            value={githubForm['github.defaultRef'] ?? settings['github.defaultRef'] ?? ''}
            onChange={(e) => setGithubForm({ ...githubForm, 'github.defaultRef': e.target.value })}
          />
          <Button onClick={handleSaveGithub} loading={savingGithub}>Save GitHub Defaults</Button>
        </div>
      </Card>

      <Card title="System Info">
        <dl className="space-y-2">
          <div className="flex gap-4">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 w-48">App Version</dt>
            <dd className="text-sm">{__APP_VERSION__}</dd>
          </div>
          {Object.entries(settings).filter(([k]) => !k.startsWith('github.')).map(([key, value]) => (
            <div key={key} className="flex gap-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 w-48">{key}</dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
