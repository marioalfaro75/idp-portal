import { Octokit } from '@octokit/rest';
import { prisma } from '../../prisma';
import { decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import { getLogEmitter } from './deployments.service';

async function getOctokit(userId: string): Promise<Octokit> {
  const conn = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error('No GitHub connection found. Connect GitHub first.');
  const token = decrypt(conn.encryptedToken);
  return new Octokit({ auth: token });
}

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error(`Invalid repo format: "${repo}". Expected "owner/repo".`);
  return { owner, repo: name };
}

export async function dispatchAndTrack(deploymentId: string, userId: string): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { template: true },
  });
  if (!deployment) throw new Error('Deployment not found');

  const octokit = await getOctokit(userId);
  const { owner, repo } = parseRepo(deployment.githubRepo!);
  const workflowId = deployment.githubWorkflowId!;
  const ref = deployment.githubRef || 'main';
  const variables = JSON.parse(deployment.variables);

  const dispatchedAt = new Date();

  await octokit.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref,
    inputs: {
      template_slug: deployment.template.slug,
      template_provider: deployment.template.provider,
      variables: JSON.stringify(variables),
      deployment_id: deployment.id,
      deployment_name: deployment.name,
      action: 'apply',
    },
  });

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: 'dispatched' },
  });

  const emitter = getLogEmitter(deploymentId);
  emitter.emit('log', { type: 'status', message: 'Workflow dispatched to GitHub Actions' });

  // Poll for the run ID after a delay
  setTimeout(async () => {
    try {
      await findAndStoreRunId(deploymentId, userId, owner, repo, workflowId, dispatchedAt);
    } catch (err) {
      logger.error(`Failed to find GitHub run for deployment ${deploymentId}`, { error: (err as Error).message });
    }
  }, 5000);
}

export async function dispatchDestroy(deploymentId: string, userId: string): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { template: true },
  });
  if (!deployment) throw new Error('Deployment not found');

  const octokit = await getOctokit(userId);
  const { owner, repo } = parseRepo(deployment.githubRepo!);
  const workflowId = deployment.githubWorkflowId!;
  const ref = deployment.githubRef || 'main';
  const variables = JSON.parse(deployment.variables);

  const dispatchedAt = new Date();

  await octokit.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref,
    inputs: {
      template_slug: deployment.template.slug,
      template_provider: deployment.template.provider,
      variables: JSON.stringify(variables),
      deployment_id: deployment.id,
      deployment_name: deployment.name,
      action: 'destroy',
    },
  });

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: 'destroying' },
  });

  const emitter = getLogEmitter(deploymentId);
  emitter.emit('log', { type: 'status', message: 'Destroy workflow dispatched to GitHub Actions' });

  setTimeout(async () => {
    try {
      await findAndStoreRunId(deploymentId, userId, owner, repo, workflowId, dispatchedAt);
    } catch (err) {
      logger.error(`Failed to find GitHub run for destroy ${deploymentId}`, { error: (err as Error).message });
    }
  }, 5000);
}

async function findAndStoreRunId(
  deploymentId: string,
  userId: string,
  owner: string,
  repo: string,
  workflowId: string,
  dispatchedAt: Date,
): Promise<void> {
  const octokit = await getOctokit(userId);

  // Try a few times to find the run
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await octokit.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowId,
      event: 'workflow_dispatch',
      per_page: 5,
    });

    const run = data.workflow_runs.find(
      (r) => new Date(r.created_at) >= dispatchedAt,
    );

    if (run) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          githubRunId: String(run.id),
          githubRunUrl: run.html_url,
        },
      });
      logger.info(`Linked deployment ${deploymentId} to GitHub run ${run.id}`);
      return;
    }

    // Wait 3 seconds before retrying
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  logger.warn(`Could not find GitHub run for deployment ${deploymentId} after retries`);
}

export async function pollGitHubDeployments(): Promise<void> {
  try {
    const deployments = await prisma.deployment.findMany({
      where: {
        executionMethod: 'github',
        status: { in: ['dispatched', 'running', 'destroying'] },
        githubRunId: { not: null },
      },
    });

    if (deployments.length === 0) return;

    // Group by createdById to reuse Octokit instances
    const byUser = new Map<string, typeof deployments>();
    for (const d of deployments) {
      const list = byUser.get(d.createdById) || [];
      list.push(d);
      byUser.set(d.createdById, list);
    }

    for (const [userId, userDeployments] of byUser) {
      let octokit: Octokit;
      try {
        octokit = await getOctokit(userId);
      } catch {
        logger.warn(`Cannot poll GitHub for user ${userId}: no connection`);
        continue;
      }

      for (const deployment of userDeployments) {
        try {
          const { owner, repo } = parseRepo(deployment.githubRepo!);
          const { data: run } = await octokit.actions.getWorkflowRun({
            owner,
            repo,
            run_id: Number(deployment.githubRunId),
          });

          let newStatus: string | null = null;
          const isDestroying = deployment.status === 'destroying';

          if (run.status === 'completed') {
            if (run.conclusion === 'success') {
              newStatus = isDestroying ? 'destroyed' : 'succeeded';
            } else {
              newStatus = 'failed';
            }
          } else if (run.status === 'in_progress') {
            newStatus = isDestroying ? 'destroying' : 'running';
          }
          // queued/waiting/pending → keep current status

          if (newStatus && newStatus !== deployment.status) {
            await prisma.deployment.update({
              where: { id: deployment.id },
              data: {
                status: newStatus,
                githubRunUrl: run.html_url,
                errorMessage: newStatus === 'failed' ? `GitHub Actions run ${run.conclusion}: ${run.html_url}` : null,
              },
            });

            const emitter = getLogEmitter(deployment.id);
            emitter.emit('log', { type: 'status', message: `GitHub Actions: ${newStatus}` });

            if (['succeeded', 'failed', 'destroyed'].includes(newStatus)) {
              emitter.emit('log', { type: 'complete', message: newStatus });
            }

            logger.info(`Deployment ${deployment.id} status updated to ${newStatus}`);
          }
        } catch (err) {
          logger.error(`Failed to poll GitHub run for deployment ${deployment.id}`, { error: (err as Error).message });
        }
      }
    }
  } catch (err) {
    logger.error('GitHub deployment polling failed', { error: (err as Error).message });
  }
}
