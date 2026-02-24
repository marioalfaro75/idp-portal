import { Octokit } from '@octokit/rest';
import { prisma } from '../../prisma';
import { NotFoundError, AppError } from '../../utils/errors';
import { encrypt, decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';

export async function getConnection(userId: string) {
  const conn = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!conn) throw new NotFoundError('GitHub connection');
  return {
    id: conn.id,
    username: conn.username,
    scopes: JSON.parse(conn.scopes),
    userId: conn.userId,
    createdAt: conn.createdAt.toISOString(),
    updatedAt: conn.updatedAt.toISOString(),
  };
}

export async function connect(token: string, userId: string) {
  const octokit = new Octokit({ auth: token });

  // Verify token
  let user: any;
  try {
    const { data } = await octokit.users.getAuthenticated();
    user = data;
  } catch {
    throw new AppError(400, 'Invalid GitHub token');
  }

  const encryptedToken = encrypt(token);

  // Get token scopes from headers
  let scopes: string[] = [];
  try {
    const resp = await octokit.request('HEAD /');
    scopes = (resp.headers['x-oauth-scopes'] || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  } catch {}

  const existing = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (existing) {
    const updated = await prisma.gitHubConnection.update({
      where: { userId },
      data: { encryptedToken, username: user.login, scopes: JSON.stringify(scopes) },
    });
    return { id: updated.id, username: updated.username, scopes, userId, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
  }

  const conn = await prisma.gitHubConnection.create({
    data: { encryptedToken, username: user.login, scopes: JSON.stringify(scopes), userId },
  });

  return { id: conn.id, username: conn.username, scopes, userId, createdAt: conn.createdAt.toISOString(), updatedAt: conn.updatedAt.toISOString() };
}

export async function disconnect(userId: string) {
  await prisma.gitHubConnection.deleteMany({ where: { userId } });
}

async function getOctokit(userId: string): Promise<Octokit> {
  const conn = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!conn) throw new NotFoundError('GitHub connection');
  const token = decrypt(conn.encryptedToken);
  return new Octokit({ auth: token });
}

export async function testConnection(userId: string) {
  try {
    const octokit = await getOctokit(userId);
    const { data } = await octokit.users.getAuthenticated();

    let scopes: string[] = [];
    try {
      const resp = await octokit.request('HEAD /');
      scopes = (resp.headers['x-oauth-scopes'] || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    } catch {}

    // Update scopes in DB if changed
    await prisma.gitHubConnection.update({
      where: { userId },
      data: { scopes: JSON.stringify(scopes) },
    });

    return { valid: true, message: 'Connection is healthy', username: data.login, scopes };
  } catch (err: any) {
    if (err.status === 401) {
      return { valid: false, message: 'Token has been revoked or expired' };
    }
    if (err instanceof NotFoundError) {
      return { valid: false, message: 'No GitHub connection found' };
    }
    return { valid: false, message: err.message || 'Connection test failed' };
  }
}

export async function getUsageStats(userId: string) {
  const ACTIVE_DEPLOYMENT_STATUSES = ['applying', 'planning', 'dispatched', 'running'];
  const ACTIVE_SERVICE_STATUSES = ['scaffolding', 'active'];

  const [deployments, services] = await Promise.all([
    prisma.deployment.findMany({
      where: { executionMethod: 'github', createdById: userId },
      select: { id: true, name: true, status: true, githubRepo: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.service.findMany({
      where: { githubRepoSlug: { not: '' }, createdById: userId },
      select: { id: true, name: true, slug: true, status: true, githubRepoSlug: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Get all distinct repo slugs for this user
  const [deploymentRepos, serviceRepos] = await Promise.all([
    prisma.deployment.findMany({
      where: { executionMethod: 'github', createdById: userId, githubRepo: { not: null } },
      select: { githubRepo: true },
      distinct: ['githubRepo'],
    }),
    prisma.service.findMany({
      where: { githubRepoSlug: { not: '' }, createdById: userId },
      select: { githubRepoSlug: true },
      distinct: ['githubRepoSlug'],
    }),
  ]);

  const activeRepoSlugs = [
    ...new Set([
      ...deploymentRepos.map((d) => d.githubRepo!),
      ...serviceRepos.map((s) => s.githubRepoSlug),
    ]),
  ];

  const activeDeploymentCount = deployments.filter((d) => ACTIVE_DEPLOYMENT_STATUSES.includes(d.status)).length;
  const activeServiceCount = services.filter((s) => ACTIVE_SERVICE_STATUSES.includes(s.status)).length;

  return {
    deployments: {
      total: deployments.length,
      active: activeDeploymentCount,
      items: deployments.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        githubRepo: d.githubRepo,
        createdAt: d.createdAt.toISOString(),
      })),
    },
    services: {
      total: services.length,
      active: activeServiceCount,
      items: services.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        status: s.status,
        githubRepoSlug: s.githubRepoSlug,
        createdAt: s.createdAt.toISOString(),
      })),
    },
    activeRepoSlugs,
  };
}

export async function listRepos(userId: string) {
  const octokit = await getOctokit(userId);
  const { data } = await octokit.repos.listForAuthenticatedUser({ per_page: 100, sort: 'updated' });
  return data.map((r) => ({
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

export async function listWorkflows(userId: string, owner: string, repo: string) {
  const octokit = await getOctokit(userId);
  const { data } = await octokit.actions.listRepoWorkflows({ owner, repo });
  return data.workflows.map((w) => ({
    id: w.id,
    name: w.name,
    path: w.path,
    state: w.state,
  }));
}

export async function dispatchWorkflow(userId: string, owner: string, repo: string, workflowId: number, ref: string, inputs?: Record<string, string>) {
  const octokit = await getOctokit(userId);
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
        'GitHub token lacks permission to dispatch workflows. ' +
        'For classic PATs, enable the "repo" scope. ' +
        'For fine-grained PATs, grant "Actions: Read and write" and "Contents: Read" permissions. ' +
        'Update your token at https://github.com/settings/tokens and reconnect in the GitHub settings page.'
      );
    }
    throw err;
  }
}

export async function createRepo(
  userId: string,
  name: string,
  description: string,
  isPrivate: boolean,
): Promise<{ owner: string; repo: string; fullName: string; htmlUrl: string }> {
  const octokit = await getOctokit(userId);
  const { data } = await octokit.repos.createForAuthenticatedUser({
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
  userId: string,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>,
): Promise<void> {
  const octokit = await getOctokit(userId);

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
  userId: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<{ content: string; sha: string }> {
  const octokit = await getOctokit(userId);
  const params: any = { owner, repo, path };
  if (ref) params.ref = ref;
  const { data } = await octokit.repos.getContent(params) as any;
  if (data.type !== 'file') throw new AppError(400, `${path} is not a file`);
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

export async function updateWorkflowFile(
  userId: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha: string,
  branch: string,
): Promise<void> {
  const octokit = await getOctokit(userId);
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
  userId: string,
  owner: string,
  repo: string,
  filename: string,
  ref: string,
  inputs?: Record<string, string>,
): Promise<{ runId: string; runUrl: string } | null> {
  const octokit = await getOctokit(userId);
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
        'GitHub token lacks permission to dispatch workflows. ' +
        'For classic PATs, enable the "repo" scope. ' +
        'For fine-grained PATs, grant "Actions: Read and write" and "Contents: Read" permissions. ' +
        'Update your token at https://github.com/settings/tokens and reconnect in the GitHub settings page.'
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
