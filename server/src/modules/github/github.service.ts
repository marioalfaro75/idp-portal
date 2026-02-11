import { Octokit } from '@octokit/rest';
import { prisma } from '../../prisma';
import { NotFoundError, AppError } from '../../utils/errors';
import { encrypt, decrypt } from '../../utils/crypto';

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
  await octokit.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref,
    inputs,
  });
}
