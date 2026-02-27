import { prisma } from '../../prisma';
import { logger } from '../../utils/logger';
import { getAppOctokit, isAppConfigured } from '../github/github-app';

export async function pollWorkflowRuns(): Promise<void> {
  try {
    const configured = await isAppConfigured();
    if (!configured) {
      logger.debug('GitHub App not configured — skipping workflow polling');
      return;
    }

    const runs = await prisma.workflowRun.findMany({
      where: {
        status: { in: ['pending', 'queued', 'in_progress'] },
        githubRunId: { not: null },
      },
      include: {
        service: true,
      },
    });

    if (runs.length === 0) return;

    const octokit = await getAppOctokit();

    for (const run of runs) {
      try {
        if (!run.service.githubRepoSlug) continue;
        const [owner, repo] = run.service.githubRepoSlug.split('/');

        const { data: ghRun } = await octokit.actions.getWorkflowRun({
          owner,
          repo,
          run_id: Number(run.githubRunId),
        });

        let newStatus: string | null = null;
        let conclusion: string | null = null;

        if (ghRun.status === 'completed') {
          conclusion = ghRun.conclusion || null;
          newStatus = ghRun.conclusion === 'success' ? 'completed' : 'failed';
        } else if (ghRun.status === 'in_progress') {
          newStatus = 'in_progress';
        } else if (ghRun.status === 'queued') {
          newStatus = 'queued';
        }

        if (newStatus && newStatus !== run.status) {
          await prisma.workflowRun.update({
            where: { id: run.id },
            data: {
              status: newStatus,
              conclusion,
              githubRunUrl: ghRun.html_url,
              completedAt: newStatus === 'completed' || newStatus === 'failed' ? new Date() : null,
            },
          });

          // If scaffold-triggered run fails, mark service as failed
          if (newStatus === 'failed' && run.triggerType === 'scaffold') {
            await prisma.service.update({
              where: { id: run.serviceId },
              data: {
                status: 'failed',
                errorMessage: `Scaffold workflow failed: ${ghRun.html_url}`,
              },
            });
          }

          logger.info(`WorkflowRun ${run.id} status updated to ${newStatus}`);
        }
      } catch (err) {
        logger.error(`Failed to poll workflow run ${run.id}`, { error: (err as Error).message });
      }
    }
  } catch (err) {
    logger.error('Workflow run polling failed', { error: (err as Error).message });
  }
}
