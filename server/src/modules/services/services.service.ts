import { prisma } from '../../prisma';
import { NotFoundError, AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { readScaffoldFiles } from '../templates/template-parser';
import * as githubService from '../github/github.service';
import * as groupsService from '../groups/groups.service';

interface UserContext {
  sub: string;
  role: string;
}

export async function list(query?: { search?: string }, user?: UserContext) {
  const where: Record<string, unknown> = {};
  if (query?.search) {
    where.OR = [
      { name: { contains: query.search } },
      { slug: { contains: query.search } },
    ];
  }

  if (user && user.role !== 'Admin' && user.role !== 'Portal Admin') {
    const accessFilter = await groupsService.getTemplateAccessFilter(user.sub);
    where.template = accessFilter;
  }

  const services = await prisma.service.findMany({
    where,
    include: {
      template: { select: { id: true, name: true, provider: true, category: true } },
      createdBy: { select: { id: true, displayName: true } },
      workflowRuns: {
        include: { triggeredBy: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return services.map(formatService);
}

export async function get(id: string, user?: UserContext) {
  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      template: { select: { id: true, name: true, provider: true, category: true } },
      createdBy: { select: { id: true, displayName: true } },
      workflowRuns: {
        include: { triggeredBy: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!service) throw new NotFoundError('Service');

  if (user && user.role !== 'Admin' && user.role !== 'Portal Admin') {
    const hasAccess = await groupsService.checkTemplateAccess(service.templateId, user.sub);
    if (!hasAccess) throw new NotFoundError('Service');
  }

  return formatService(service);
}

export async function create(
  data: { name: string; templateId: string; parameters: Record<string, string> },
  userId: string,
) {
  const template = await prisma.template.findUnique({ where: { id: data.templateId } });
  if (!template) throw new NotFoundError('Template');
  if (!template.hasScaffold) throw new AppError(400, 'Template does not support scaffolding');

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const existing = await prisma.service.findUnique({ where: { slug } });
  if (existing) throw new AppError(409, `A service with slug "${slug}" already exists`);

  const service = await prisma.service.create({
    data: {
      name: data.name,
      slug,
      status: 'scaffolding',
      templateId: data.templateId,
      parameters: JSON.stringify(data.parameters),
      createdById: userId,
    },
    include: {
      template: { select: { id: true, name: true, provider: true, category: true } },
      createdBy: { select: { id: true, displayName: true } },
      workflowRuns: {
        include: { triggeredBy: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Run scaffold asynchronously
  scaffoldAsync(service.id, userId, template, data.parameters).catch((err) => {
    logger.error(`Scaffold failed for service ${service.id}`, { error: (err as Error).message });
  });

  return formatService(service);
}

async function scaffoldAsync(
  serviceId: string,
  userId: string,
  template: { id: string; slug: string; templatePath: string; workflow: string | null },
  parameters: Record<string, string>,
) {
  try {
    // 1. Create GitHub repo
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return;

    const repoResult = await githubService.createRepo(
      userId,
      service.slug,
      `${service.name} - scaffolded from ${template.slug}`,
      false,
    );

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        githubRepoUrl: repoResult.htmlUrl,
        githubRepoSlug: repoResult.fullName,
      },
    });

    // 2. Read and process scaffold files
    const files = readScaffoldFiles(template.templatePath, {
      ...parameters,
      service_name: service.slug,
    });

    if (files.length === 0) {
      throw new Error('No scaffold files found in template');
    }

    // 3. Push scaffold files to repo
    await githubService.pushScaffoldFiles(
      userId,
      repoResult.owner,
      repoResult.repo,
      files,
    );

    // 4. If template has a workflow, dispatch it
    if (template.workflow) {
      // Small delay to let GitHub index the new files
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const runResult = await githubService.dispatchWorkflowByName(
        userId,
        repoResult.owner,
        repoResult.repo,
        template.workflow,
        'main',
        parameters,
      );

      if (runResult) {
        await prisma.workflowRun.create({
          data: {
            serviceId,
            githubRunId: runResult.runId,
            githubRunUrl: runResult.runUrl,
            workflowName: template.workflow,
            status: 'in_progress',
            triggerType: 'scaffold',
            triggeredById: userId,
            startedAt: new Date(),
          },
        });
      }
    }

    // 5. Update service status to active
    await prisma.service.update({
      where: { id: serviceId },
      data: { status: 'active' },
    });

    logger.info(`Service ${serviceId} scaffolded successfully`);
  } catch (err) {
    logger.error(`Scaffold failed for service ${serviceId}`, { error: (err as Error).message });
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: 'failed',
        errorMessage: (err as Error).message,
      },
    });
  }
}

export async function triggerWorkflow(
  serviceId: string,
  userId: string,
  workflowName?: string,
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { template: true },
  });
  if (!service) throw new NotFoundError('Service');
  if (!service.githubRepoSlug) throw new AppError(400, 'Service has no GitHub repository');

  const workflow = workflowName || service.template.workflow;
  if (!workflow) throw new AppError(400, 'No workflow configured for this service');

  const [owner, repo] = service.githubRepoSlug.split('/');
  const parameters = JSON.parse(service.parameters);

  const runResult = await githubService.dispatchWorkflowByName(
    userId,
    owner,
    repo,
    workflow,
    'main',
    parameters,
  );

  const workflowRun = await prisma.workflowRun.create({
    data: {
      serviceId,
      githubRunId: runResult?.runId || null,
      githubRunUrl: runResult?.runUrl || null,
      workflowName: workflow,
      status: runResult ? 'in_progress' : 'pending',
      triggerType: 'manual',
      triggeredById: userId,
      startedAt: runResult ? new Date() : null,
    },
    include: { triggeredBy: { select: { id: true, displayName: true } } },
  });

  return formatWorkflowRun(workflowRun);
}

export async function retryWorkflow(
  serviceId: string,
  runId: string,
  userId: string,
) {
  const originalRun = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { service: { include: { template: true } } },
  });
  if (!originalRun) throw new NotFoundError('Workflow run');
  if (originalRun.serviceId !== serviceId) throw new AppError(400, 'Run does not belong to this service');

  const service = originalRun.service;
  if (!service.githubRepoSlug) throw new AppError(400, 'Service has no GitHub repository');

  const workflow = originalRun.workflowName || service.template.workflow;
  if (!workflow) throw new AppError(400, 'No workflow to retry');

  const [owner, repo] = service.githubRepoSlug.split('/');
  const parameters = JSON.parse(service.parameters);

  const runResult = await githubService.dispatchWorkflowByName(
    userId,
    owner,
    repo,
    workflow,
    'main',
    parameters,
  );

  const workflowRun = await prisma.workflowRun.create({
    data: {
      serviceId,
      githubRunId: runResult?.runId || null,
      githubRunUrl: runResult?.runUrl || null,
      workflowName: workflow,
      status: runResult ? 'in_progress' : 'pending',
      triggerType: 'retry',
      triggeredById: userId,
      startedAt: runResult ? new Date() : null,
    },
    include: { triggeredBy: { select: { id: true, displayName: true } } },
  });

  // If service was failed, move it back to active
  if (service.status === 'failed') {
    await prisma.service.update({
      where: { id: serviceId },
      data: { status: 'active', errorMessage: null },
    });
  }

  return formatWorkflowRun(workflowRun);
}

function formatService(s: any) {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status,
    templateId: s.templateId,
    template: s.template || undefined,
    githubRepoUrl: s.githubRepoUrl,
    githubRepoSlug: s.githubRepoSlug,
    parameters: JSON.parse(s.parameters),
    errorMessage: s.errorMessage,
    createdById: s.createdById,
    createdBy: s.createdBy || undefined,
    workflowRuns: s.workflowRuns?.map(formatWorkflowRun) || [],
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function formatWorkflowRun(r: any) {
  return {
    id: r.id,
    serviceId: r.serviceId,
    githubRunId: r.githubRunId,
    githubRunUrl: r.githubRunUrl,
    workflowName: r.workflowName,
    status: r.status,
    conclusion: r.conclusion,
    triggerType: r.triggerType,
    triggeredById: r.triggeredById,
    triggeredBy: r.triggeredBy || undefined,
    startedAt: r.startedAt?.toISOString() || null,
    completedAt: r.completedAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
