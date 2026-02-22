import { prisma } from '../../prisma';
import { NotFoundError, ConflictError, AppError, ValidationError } from '../../utils/errors';
import { deploymentQueue } from './deployment-queue';
import * as terraformRunner from './terraform-runner';
import * as githubExecutor from './github-executor';
import * as cloudConnectionService from '../cloud-connections/cloud-connections.service';
import * as groupsService from '../groups/groups.service';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import type { TemplateVariable } from '@idp/shared';
import { validateVariables } from '@idp/shared';

interface UserContext {
  sub: string;
  role: string;
}

// SSE log emitters per deployment
const logEmitters = new Map<string, EventEmitter>();

export function getLogEmitter(deploymentId: string): EventEmitter {
  if (!logEmitters.has(deploymentId)) {
    logEmitters.set(deploymentId, new EventEmitter());
  }
  return logEmitters.get(deploymentId)!;
}

export async function list(user?: UserContext) {
  const where: Record<string, unknown> = {};

  if (user && user.role !== 'Admin') {
    const accessFilter = await groupsService.getTemplateAccessFilter(user.sub);
    where.template = accessFilter;
  }

  const deployments = await prisma.deployment.findMany({
    where,
    include: {
      template: { select: { id: true, name: true, provider: true, category: true } },
      cloudConnection: { select: { id: true, name: true, provider: true } },
      createdBy: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return deployments.map(formatDeployment);
}

export async function get(id: string, user?: UserContext) {
  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: {
      template: { select: { id: true, name: true, provider: true, category: true } },
      cloudConnection: { select: { id: true, name: true, provider: true } },
      createdBy: { select: { id: true, displayName: true } },
    },
  });
  if (!deployment) throw new NotFoundError('Deployment');

  if (user && user.role !== 'Admin') {
    const hasAccess = await groupsService.checkTemplateAccess(deployment.templateId, user.sub);
    if (!hasAccess) throw new NotFoundError('Deployment');
  }

  return formatDeployment(deployment);
}

export async function create(data: { name: string; templateId: string; cloudConnectionId: string; variables: Record<string, string>; executionMethod?: string; githubRepo?: string; githubWorkflowId?: string; githubRef?: string }, user: UserContext) {
  const template = await prisma.template.findUnique({ where: { id: data.templateId } });
  if (!template) throw new NotFoundError('Template');

  if (user.role !== 'Admin') {
    const hasAccess = await groupsService.checkTemplateAccess(data.templateId, user.sub);
    if (!hasAccess) throw new NotFoundError('Template');
  }

  const connection = await prisma.cloudConnection.findUnique({ where: { id: data.cloudConnectionId } });
  if (!connection) throw new NotFoundError('Cloud connection');

  if (connection.provider !== template.provider) {
    throw new AppError(400, `Cloud connection provider (${connection.provider}) doesn't match template provider (${template.provider})`);
  }

  // Validate variables against template definitions
  const templateVars: TemplateVariable[] = JSON.parse(template.variables || '[]');
  const varErrors = validateVariables(data.variables, templateVars);
  if (Object.keys(varErrors).length > 0) {
    throw new ValidationError('Variable validation failed', varErrors);
  }

  const executionMethod = data.executionMethod || 'local';

  const deployment = await prisma.deployment.create({
    data: {
      name: data.name,
      templateId: data.templateId,
      cloudConnectionId: data.cloudConnectionId,
      variables: JSON.stringify(data.variables),
      executionMethod,
      githubRepo: data.githubRepo || null,
      githubWorkflowId: data.githubWorkflowId || null,
      githubRef: data.githubRef || null,
      createdById: user.sub,
    },
    include: {
      template: { select: { id: true, name: true, provider: true, category: true } },
      cloudConnection: { select: { id: true, name: true, provider: true } },
      createdBy: { select: { id: true, displayName: true } },
    },
  });

  if (executionMethod === 'github') {
    githubExecutor.dispatchAndTrack(deployment.id, user.sub).catch((err) => {
      logger.error(`GitHub dispatch failed for deployment ${deployment.id}`, { error: (err as Error).message });
      prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'failed', errorMessage: (err as Error).message },
      }).catch(() => {});
    });
  } else {
    deploymentQueue.enqueue({
      deploymentId: deployment.id,
      action: 'plan_and_apply',
      execute: () => executePlanAndApply(deployment.id),
    });
  }

  return formatDeployment(deployment);
}

async function executePlanAndApply(deploymentId: string) {
  const emitter = getLogEmitter(deploymentId);

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { template: true, cloudConnection: true },
    });
    if (!deployment) return;

    const { credentials } = await cloudConnectionService.getDecryptedCredentials(deployment.cloudConnectionId);
    const variables = JSON.parse(deployment.variables);
    const templateVarDefs: TemplateVariable[] = JSON.parse(deployment.template.variables || '[]');

    // Plan phase
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'planning' } });
    emitter.emit('log', { type: 'status', message: 'Planning...' });

    const planResult = await terraformRunner.plan(
      deployment.template.templatePath,
      variables,
      deployment.template.provider,
      credentials,
      templateVarDefs,
      (msg) => emitter.emit('log', { type: 'log', message: msg }),
    );

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { planOutput: planResult.output, status: planResult.success ? 'planned' : 'failed', errorMessage: planResult.success ? null : planResult.output },
    });

    if (!planResult.success) {
      emitter.emit('log', { type: 'error', message: 'Plan failed' });
      emitter.emit('log', { type: 'complete', message: 'failed' });
      return;
    }

    // Apply phase
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'applying' } });
    emitter.emit('log', { type: 'status', message: 'Applying...' });

    const applyResult = await terraformRunner.apply(
      deployment.template.templatePath,
      variables,
      deployment.template.provider,
      credentials,
      templateVarDefs,
      deployment.terraformState,
      (msg) => emitter.emit('log', { type: 'log', message: msg }),
    );

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        applyOutput: applyResult.output,
        status: applyResult.success ? 'succeeded' : 'failed',
        outputs: applyResult.outputs ? JSON.stringify(applyResult.outputs) : null,
        errorMessage: applyResult.success ? null : applyResult.output,
        terraformState: applyResult.state || null,
      },
    });

    emitter.emit('log', { type: 'complete', message: applyResult.success ? 'succeeded' : 'failed' });
  } catch (err) {
    logger.error(`Deployment ${deploymentId} failed`, { error: (err as Error).message });
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'failed', errorMessage: (err as Error).message },
    });
    emitter.emit('log', { type: 'error', message: (err as Error).message });
    emitter.emit('log', { type: 'complete', message: 'failed' });
  }
}

export async function destroyDeployment(id: string, userId: string) {
  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!deployment) throw new NotFoundError('Deployment');
  if (deployment.status !== 'succeeded') {
    throw new AppError(400, 'Can only destroy succeeded deployments');
  }

  if (deployment.executionMethod === 'github') {
    await prisma.deployment.update({ where: { id }, data: { status: 'destroying' } });
    githubExecutor.dispatchDestroy(id, userId).catch((err) => {
      logger.error(`GitHub destroy dispatch failed for deployment ${id}`, { error: (err as Error).message });
      prisma.deployment.update({
        where: { id },
        data: { status: 'failed', errorMessage: (err as Error).message },
      }).catch(() => {});
    });
  } else {
    await prisma.deployment.update({ where: { id }, data: { status: 'destroying' } });
    deploymentQueue.enqueue({
      deploymentId: id,
      action: 'destroy',
      execute: () => executeDestroy(id),
    });
  }

  return get(id);
}

export async function rollbackDeployment(id: string, userId: string) {
  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!deployment) throw new NotFoundError('Deployment');
  if (deployment.status !== 'succeeded') {
    throw new AppError(400, 'Can only roll back succeeded deployments');
  }

  if (deployment.executionMethod === 'github') {
    await prisma.deployment.update({ where: { id }, data: { status: 'rolling_back' } });
    githubExecutor.dispatchRollback(id, userId).catch((err) => {
      logger.error(`GitHub rollback dispatch failed for deployment ${id}`, { error: (err as Error).message });
      prisma.deployment.update({
        where: { id },
        data: { status: 'failed', errorMessage: (err as Error).message },
      }).catch(() => {});
    });
  } else {
    await prisma.deployment.update({ where: { id }, data: { status: 'rolling_back' } });
    deploymentQueue.enqueue({
      deploymentId: id,
      action: 'rollback',
      execute: () => executeRollback(id),
    });
  }

  return get(id);
}

async function executeRollback(deploymentId: string) {
  const emitter = getLogEmitter(deploymentId);

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { template: true },
    });
    if (!deployment || !deployment.terraformState) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'rolled_back', destroyOutput: 'No state found, marking as rolled back' },
      });
      emitter.emit('log', { type: 'complete', message: 'rolled_back' });
      return;
    }

    const { credentials } = await cloudConnectionService.getDecryptedCredentials(deployment.cloudConnectionId);
    const variables = JSON.parse(deployment.variables);
    const templateVarDefs: TemplateVariable[] = JSON.parse(deployment.template.variables || '[]');

    emitter.emit('log', { type: 'status', message: 'Rolling back...' });

    const result = await terraformRunner.destroy(
      deployment.template.templatePath,
      variables,
      deployment.template.provider,
      credentials,
      templateVarDefs,
      deployment.terraformState,
      (msg) => emitter.emit('log', { type: 'log', message: msg }),
    );

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        destroyOutput: result.output,
        status: result.success ? 'rolled_back' : 'failed',
        errorMessage: result.success ? null : result.output,
        terraformState: result.success ? null : deployment.terraformState,
      },
    });

    emitter.emit('log', { type: 'complete', message: result.success ? 'rolled_back' : 'failed' });
  } catch (err) {
    logger.error(`Rollback ${deploymentId} failed`, { error: (err as Error).message });
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'failed', errorMessage: (err as Error).message },
    });
    emitter.emit('log', { type: 'error', message: (err as Error).message });
    emitter.emit('log', { type: 'complete', message: 'failed' });
  }
}

async function executeDestroy(deploymentId: string) {
  const emitter = getLogEmitter(deploymentId);

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { template: true },
    });
    if (!deployment || !deployment.terraformState) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'destroyed', destroyOutput: 'No state found, marking as destroyed' },
      });
      emitter.emit('log', { type: 'complete', message: 'destroyed' });
      return;
    }

    const { credentials } = await cloudConnectionService.getDecryptedCredentials(deployment.cloudConnectionId);
    const variables = JSON.parse(deployment.variables);
    const templateVarDefs: TemplateVariable[] = JSON.parse(deployment.template.variables || '[]');

    emitter.emit('log', { type: 'status', message: 'Destroying...' });

    const result = await terraformRunner.destroy(
      deployment.template.templatePath,
      variables,
      deployment.template.provider,
      credentials,
      templateVarDefs,
      deployment.terraformState,
      (msg) => emitter.emit('log', { type: 'log', message: msg }),
    );

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        destroyOutput: result.output,
        status: result.success ? 'destroyed' : 'failed',
        errorMessage: result.success ? null : result.output,
        terraformState: result.success ? null : deployment.terraformState,
      },
    });

    emitter.emit('log', { type: 'complete', message: result.success ? 'destroyed' : 'failed' });
  } catch (err) {
    logger.error(`Destroy ${deploymentId} failed`, { error: (err as Error).message });
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'failed', errorMessage: (err as Error).message },
    });
    emitter.emit('log', { type: 'error', message: (err as Error).message });
    emitter.emit('log', { type: 'complete', message: 'failed' });
  }
}

const STALE_STATUSES = ['failed', 'destroyed', 'rolled_back', 'pending', 'planned'];
const ACTIVE_STATUSES = ['applying', 'planning', 'destroying', 'rolling_back', 'dispatched', 'running'];

export async function cleanupStale() {
  const result = await prisma.deployment.deleteMany({
    where: { status: { in: STALE_STATUSES } },
  });
  return { deleted: result.count };
}

export async function remove(id: string) {
  const deployment = await prisma.deployment.findUnique({ where: { id } });
  if (!deployment) throw new NotFoundError('Deployment');
  if (ACTIVE_STATUSES.includes(deployment.status)) {
    throw new ConflictError('Cannot delete a deployment that is currently in progress');
  }
  await prisma.deployment.delete({ where: { id } });
}

export async function purgeFailed() {
  const result = await prisma.deployment.deleteMany({
    where: { status: 'failed' },
  });
  return { deleted: result.count };
}

function formatDeployment(d: any) {
  return {
    id: d.id,
    name: d.name,
    status: d.status,
    templateId: d.templateId,
    template: d.template,
    cloudConnectionId: d.cloudConnectionId,
    cloudConnection: d.cloudConnection,
    variables: JSON.parse(d.variables || '{}'),
    planOutput: d.planOutput,
    applyOutput: d.applyOutput,
    destroyOutput: d.destroyOutput,
    outputs: d.outputs ? JSON.parse(d.outputs) : null,
    errorMessage: d.errorMessage,
    executionMethod: d.executionMethod || 'local',
    githubRepo: d.githubRepo || null,
    githubRunUrl: d.githubRunUrl || null,
    createdById: d.createdById,
    createdBy: d.createdBy,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}
