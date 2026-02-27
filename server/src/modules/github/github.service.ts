import { encrypt } from '../../utils/crypto';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import * as settingsService from '../settings/settings.service';
import {
  getAppOctokit,
  getAppConfig,
  isAppConfigured,
  getInstallationOwner,
  invalidateCache,
  SETTINGS_KEYS,
} from './github-app';

export async function getAppStatus() {
  const configured = await isAppConfigured();
  if (!configured) return { configured: false };

  const config = await getAppConfig();
  const owner = await getInstallationOwner();
  return {
    configured: true,
    appId: config?.appId,
    installationId: config?.installationId,
    owner,
  };
}

export async function testAppConnection() {
  const config = await getAppConfig();
  if (!config) {
    return { valid: false, message: 'GitHub App is not configured' };
  }

  try {
    const octokit = await getAppOctokit();
    const { data } = await octokit.apps.getInstallation({
      installation_id: Number(config.installationId),
    });

    const owner = (data.account as any)?.login || 'unknown';
    const permissions = data.permissions || {};

    return {
      valid: true,
      message: 'GitHub App connection is healthy',
      owner,
      permissions,
    };
  } catch (err: any) {
    if (err.status === 401) {
      return { valid: false, message: 'Authentication failed — check the App ID and private key' };
    }
    if (err.status === 404) {
      return { valid: false, message: 'Installation not found — check the Installation ID' };
    }
    return { valid: false, message: err.message || 'Connection test failed' };
  }
}

export async function saveAppConfig(appId: string, installationId: string, privateKey: string) {
  const encryptedKey = encrypt(privateKey);
  await Promise.all([
    settingsService.set(SETTINGS_KEYS.appId, appId),
    settingsService.set(SETTINGS_KEYS.installationId, installationId),
    settingsService.set(SETTINGS_KEYS.privateKey, encryptedKey),
  ]);
  invalidateCache();
}

export async function removeAppConfig() {
  await Promise.all([
    settingsService.del(SETTINGS_KEYS.appId),
    settingsService.del(SETTINGS_KEYS.installationId),
    settingsService.del(SETTINGS_KEYS.privateKey),
  ]);
  invalidateCache();
}

export async function listRepos() {
  const octokit = await getAppOctokit();
  const { data } = await octokit.apps.listReposAccessibleToInstallation({ per_page: 100 });
  return data.repositories.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    htmlUrl: r.html_url,
    defaultBranch: r.default_branch,
    language: r.language || null,
    updatedAt: r.updated_at || null,
  }));
}

export async function listWorkflows(owner: string, repo: string) {
  const octokit = await getAppOctokit();
  const { data } = await octokit.actions.listRepoWorkflows({ owner, repo });
  return data.workflows.map((w) => ({
    id: w.id,
    name: w.name,
    path: w.path,
    state: w.state,
  }));
}

export async function dispatchWorkflow(owner: string, repo: string, workflowId: number, ref: string, inputs?: Record<string, string>) {
  const octokit = await getAppOctokit();
  try {
    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowId,
      ref,
      inputs,
    });
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('Resource not accessible')) {
      throw new AppError(403,
        'GitHub App lacks permission to dispatch workflows. ' +
        'Ensure the App has "Actions: Read and write" and "Contents: Read" permissions. ' +
        'Check the App installation settings on GitHub.'
      );
    }
    throw err;
  }
}

export async function createRepo(
  name: string,
  description: string,
  isPrivate: boolean,
): Promise<{ owner: string; repo: string; fullName: string; htmlUrl: string }> {
  const octokit = await getAppOctokit();
  const installOwner = await getInstallationOwner();
  if (!installOwner) {
    throw new AppError(503, 'Could not determine GitHub App installation owner');
  }

  const { data } = await octokit.repos.createInOrg({
    org: installOwner,
    name,
    description,
    private: isPrivate,
    auto_init: true,
  });
  return {
    owner: data.owner.login,
    repo: data.name,
    fullName: data.full_name,
    htmlUrl: data.html_url,
  };
}

export async function pushScaffoldFiles(
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>,
): Promise<void> {
  const octokit = await getAppOctokit();

  // Get the reference to main branch
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
  const baseSha = ref.object.sha;

  // Get the commit to find the base tree
  const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: baseSha });
  const baseTreeSha = commit.tree.sha;

  // Create blobs for each file
  const tree: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];
  for (const file of files) {
    const { data: blob } = await octokit.git.createBlob({
      owner,
      repo,
      content: Buffer.from(file.content).toString('base64'),
      encoding: 'base64',
    });
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  // Create tree
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree,
  });

  // Create commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'Initial scaffold from IDP Portal',
    tree: newTree.sha,
    parents: [baseSha],
  });

  // Update ref
  await octokit.git.updateRef({
    owner,
    repo,
    ref: 'heads/main',
    sha: newCommit.sha,
  });
}

export async function getWorkflowFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<{ content: string; sha: string }> {
  const octokit = await getAppOctokit();
  const params: any = { owner, repo, path };
  if (ref) params.ref = ref;
  const { data } = await octokit.repos.getContent(params) as any;
  if (data.type !== 'file') throw new AppError(400, `${path} is not a file`);
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

export async function updateWorkflowFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha: string,
  branch: string,
): Promise<void> {
  const octokit = await getAppOctokit();
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: 'Auto-fix workflow: add workflow_dispatch inputs for IDP deployments',
    content: Buffer.from(content).toString('base64'),
    sha,
    branch,
  });
}

export async function dispatchWorkflowByName(
  owner: string,
  repo: string,
  filename: string,
  ref: string,
  inputs?: Record<string, string>,
): Promise<{ runId: string; runUrl: string } | null> {
  const octokit = await getAppOctokit();
  const dispatchedAt = new Date();

  try {
    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: filename,
      ref,
      inputs,
    });
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('Resource not accessible')) {
      throw new AppError(403,
        'GitHub App lacks permission to dispatch workflows. ' +
        'Ensure the App has "Actions: Read and write" and "Contents: Read" permissions. ' +
        'Check the App installation settings on GitHub.'
      );
    }
    throw err;
  }

  // Wait for run to appear
  await new Promise((resolve) => setTimeout(resolve, 5000));

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { data } = await octokit.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: filename,
        event: 'workflow_dispatch',
        per_page: 5,
      });

      const run = data.workflow_runs.find(
        (r) => new Date(r.created_at) >= dispatchedAt,
      );

      if (run) {
        return { runId: String(run.id), runUrl: run.html_url };
      }
    } catch (err) {
      logger.warn(`Attempt ${attempt + 1} to find workflow run failed`, { error: (err as Error).message });
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  logger.warn(`Could not find workflow run for ${owner}/${repo}/${filename} after retries`);
  return null;
}
