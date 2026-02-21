import { Octokit } from '@octokit/rest';
import { prisma } from '../../prisma';
import { decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import { getLogEmitter } from './deployments.service';
import { listWorkflows, getWorkflowFileContent, updateWorkflowFile } from '../github/github.service';
import { ensureWorkflowDispatch } from '../github/workflow-validator';

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

async function ensureWorkflowReady(
  deploymentId: string,
  userId: string,
  owner: string,
  repo: string,
  workflowId: string,
  ref: string,
): Promise<void> {
  const emitter = getLogEmitter(deploymentId);
  try {
    // Resolve workflow file path from workflow ID
    const workflows = await listWorkflows(userId, owner, repo);
    const workflow = workflows.find((w) => String(w.id) === workflowId || w.path === workflowId || w.name === workflowId);
    if (!workflow) {
      emitter.emit('log', { type: 'warning', message: 'Could not find workflow file to validate — proceeding with dispatch' });
      return;
    }

    const filePath = workflow.path; // e.g. ".github/workflows/deploy.yml"
    emitter.emit('log', { type: 'status', message: `Validating workflow file: ${filePath}` });

    const { content, sha } = await getWorkflowFileContent(userId, owner, repo, filePath, ref);
    const result = ensureWorkflowDispatch(content);

    if (result.valid) {
      emitter.emit('log', { type: 'status', message: 'Workflow file validated — all required inputs present' });
      return;
    }

    if (!result.fixed) {
      emitter.emit('log', { type: 'warning', message: `Workflow validation failed: ${result.changes.join('; ')}. Proceeding with dispatch anyway.` });
      return;
    }

    // Commit the fix
    emitter.emit('log', { type: 'status', message: `Auto-fixing workflow: ${result.changes.join('; ')}` });
    await updateWorkflowFile(userId, owner, repo, filePath, result.fixed, sha, ref);
    emitter.emit('log', { type: 'status', message: 'Workflow file updated — waiting for GitHub to process changes...' });

    // Wait for GitHub to process the commit before dispatching
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (err) {
    logger.warn(`Workflow validation failed for deployment ${deploymentId}`, { error: (err as Error).message });
    const emitter = getLogEmitter(deploymentId);
    emitter.emit('log', { type: 'warning', message: `Workflow validation skipped: ${(err as Error).message}` });
  }
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

  await ensureWorkflowReady(deploymentId, userId, owner, repo, workflowId, ref);

  const dispatchedAt = new Date();

  try {
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
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('Resource not accessible')) {
      throw new Error(
        'GitHub token lacks permission to dispatch workflows. ' +
        'For classic PATs, enable the "repo" scope. ' +
        'For fine-grained PATs, grant "Actions: Read and write" and "Contents: Read" permissions. ' +
        'Update your token at https://github.com/settings/tokens and reconnect in the GitHub settings page.'
      );
    }
    throw err;
  }

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

  await ensureWorkflowReady(deploymentId, userId, owner, repo, workflowId, ref);

  const dispatchedAt = new Date();

  try {
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
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('Resource not accessible')) {
      throw new Error(
        'GitHub token lacks permission to dispatch workflows. ' +
        'For classic PATs, enable the "repo" scope. ' +
        'For fine-grained PATs, grant "Actions: Read and write" and "Contents: Read" permissions. ' +
        'Update your token at https://github.com/settings/tokens and reconnect in the GitHub settings page.'
      );
    }
    throw err;
  }

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
