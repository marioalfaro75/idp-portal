import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { githubApi } from '../../api/github';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { GitBranch, ExternalLink, Info, Search, CheckCircle } from 'lucide-react';
import { timeAgo } from '../../utils/time';
import { Link } from 'react-router-dom';

export function GitHubPage() {
  const [repoSearch, setRepoSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const { data: status, isLoading } = useQuery({
    queryKey: ['githubStatus'],
    queryFn: githubApi.getStatus,
    retry: false,
  });

  const { data: repos = [] } = useQuery({
    queryKey: ['githubRepos'],
    queryFn: githubApi.listRepos,
    enabled: !!status?.configured,
  });

  const languageOptions = useMemo(() => {
    const langs = new Set<string>();
    repos.forEach((r) => { if (r.language) langs.add(r.language); });
    return Array.from(langs).sort().map((l) => ({ value: l, label: l }));
  }, [repos]);

  const filteredRepos = useMemo(() => {
    let result = repos;
    if (repoSearch) {
      const q = repoSearch.toLowerCase();
      result = result.filter((r) => r.fullName.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
    }
    if (languageFilter) {
      result = result.filter((r) => r.language === languageFilter);
    }
    return result;
  }, [repos, repoSearch, languageFilter]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  // Not configured state
  if (!status?.configured) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">GitHub Integration</h1>

        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">What GitHub integration enables</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
              <li>Deploy infrastructure via GitHub Actions workflows</li>
              <li>Scaffold new services from templates into GitHub repos</li>
              <li>Dispatch and monitor workflow runs</li>
            </ul>
          </div>
        </div>

        <Card title="GitHub App Not Configured">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A Portal Admin needs to configure the GitHub App in the{' '}
              <Link to="/admin" className="text-primary-600 hover:underline font-medium">Portal Administration</Link>{' '}
              page before GitHub features can be used.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The GitHub App provides secure, centralized access to your organization's repositories
              using short-lived installation tokens instead of personal access tokens.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Configured state
  const repoCountLabel = filteredRepos.length === repos.length
    ? `Repositories (${repos.length})`
    : `Repositories (${filteredRepos.length} of ${repos.length})`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">GitHub Integration</h1>

      {/* App Status Card */}
      <Card title="GitHub App">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Connected</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" /> App ID: {status.appId}
            </span>
            <span>Installation: {status.installationId}</span>
            {status.owner && <span>Organization: <span className="font-medium text-gray-700 dark:text-gray-300">{status.owner}</span></span>}
          </div>
        </div>
      </Card>

      {/* Repositories Card */}
      <Card title={repoCountLabel}>
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Search repositories..."
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 pl-9 pr-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="w-48">
              <Select
                options={languageOptions}
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Repo list */}
          <div className="divide-y dark:divide-gray-700 max-h-[32rem] overflow-y-auto table-scroll">
            {filteredRepos.map((repo) => {
              const [owner, name] = repo.fullName.split('/');
              return (
                <div key={repo.id} className="group py-3">
                  <div className="flex items-center gap-2">
                    <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 min-w-0 shrink">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{owner} /</span>
                      <span className="font-medium text-primary-600 dark:text-primary-400 hover:underline truncate">{name}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </a>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {repo.private && <Badge variant="warning">private</Badge>}
                      {repo.language && <Badge variant="info">{repo.language}</Badge>}
                    </div>
                    {repo.updatedAt && <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{timeAgo(repo.updatedAt)}</span>}
                  </div>
                  {repo.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 pl-0">{repo.description}</p>
                  )}
                </div>
              );
            })}
            {filteredRepos.length === 0 && repos.length > 0 && (
              <p className="text-gray-500 dark:text-gray-400 py-4 text-center">No repositories match your filters</p>
            )}
            {repos.length === 0 && <p className="text-gray-500 dark:text-gray-400 py-4 text-center">No repositories found</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}
