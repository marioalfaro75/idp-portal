import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, TerraformStatus } from '../../api/settings';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const sourceLabels: Record<TerraformStatus['source'], string> = {
  'system-setting': 'Managed by IDP',
  'env-var': 'Environment variable',
  'default': 'System PATH',
};

export function TerraformPage() {
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [savingPath, setSavingPath] = useState(false);
  const [pathError, setPathError] = useState('');

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['terraform-status'],
    queryFn: settingsApi.terraformStatus,
  });

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['terraform-versions'],
    queryFn: settingsApi.terraformVersions,
  });

  const versions = versionsData?.versions || [];

  const handleInstall = async () => {
    const version = selectedVersion || versions[0];
    if (!version) return;
    setInstalling(true);
    setInstallError('');
    try {
      await settingsApi.terraformInstall(version);
      toast.success(`Terraform ${version} installed successfully`);
      queryClient.invalidateQueries({ queryKey: ['terraform-status'] });
    } catch (err: any) {
      let message: string;
      if (err.response?.data?.error?.message) {
        message = err.response.data.error.message;
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        message = 'Request timed out — the download may be taking too long. Try again or use a custom binary path instead.';
      } else if (!err.response) {
        message = 'Could not reach the server. Check that the backend is running.';
      } else {
        message = `Installation failed (HTTP ${err.response.status})`;
      }
      setInstallError(message);
    } finally {
      setInstalling(false);
    }
  };

  const handleSetPath = async () => {
    if (!customPath.trim()) return;
    setSavingPath(true);
    setPathError('');
    try {
      const result = await settingsApi.terraformSetPath(customPath.trim());
      toast.success(`Custom path saved — Terraform v${result.version}`);
      queryClient.invalidateQueries({ queryKey: ['terraform-status'] });
      setCustomPath('');
    } catch (err: any) {
      setPathError(err.response?.data?.error?.message || 'Failed to validate path');
    } finally {
      setSavingPath(false);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['terraform-status'] });
  };

  if (statusLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Terraform</h1>

      {/* Status Card */}
      <Card title="Status">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-24">Status</span>
            {status?.available ? (
              <Badge variant="success">Installed v{status.version}</Badge>
            ) : (
              <Badge variant="danger">Not Installed</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-24">Binary Path</span>
            <span className="text-sm font-mono">{status?.binaryPath || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-24">Source</span>
            <span className="text-sm">{status ? sourceLabels[status.source] : '—'}</span>
          </div>
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Check Status
            </Button>
          </div>
        </div>
      </Card>

      {/* Install / Update Card */}
      <Card title="Install / Update">
        <div className="space-y-4 max-w-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Download and install a Terraform binary directly from HashiCorp releases. The binary will be stored in the server's <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">bin/</code> directory.
          </p>
          <Select
            label="Version"
            options={versions.map((v) => ({ value: v, label: `v${v}${v === versions[0] ? ' (latest)' : ''}` }))}
            value={selectedVersion}
            onChange={(e) => { setSelectedVersion(e.target.value); setInstallError(''); }}
            disabled={versionsLoading}
          />
          <Button
            onClick={handleInstall}
            loading={installing}
            disabled={versionsLoading || versions.length === 0}
          >
            {installing ? 'Installing...' : 'Download & Install'}
          </Button>
          {installError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{installError}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Custom Path Card */}
      <Card title="Custom Binary Path">
        <div className="space-y-4 max-w-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Point to an existing Terraform binary on the server. The path will be validated before saving.
          </p>
          <Input
            label="Binary Path"
            placeholder="/usr/local/bin/terraform"
            value={customPath}
            onChange={(e) => { setCustomPath(e.target.value); setPathError(''); }}
            error={pathError}
          />
          <Button
            variant="secondary"
            onClick={handleSetPath}
            loading={savingPath}
            disabled={!customPath.trim()}
          >
            Test & Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
