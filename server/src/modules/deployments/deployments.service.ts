import { prisma } from '../../prisma';
import { NotFoundError, AppError } from '../../utils/errors';
import { deploymentQueue } from './deployment-queue';
import * as terraformRunner from './terraform-runner';
import * as cloudConnectionService from '../cloud-connections/cloud-connections.service';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

// SSE log emitters per deployment
const logEmitters = new Map<string, EventEmitter>();

export function getLogEmitter(deploymentId: string): EventEmitter {
  if (!logEmitters.has(deploymentId)) {
    logEmitters.set(deploymentId, new EventEmitter());
  }
  return logEmitters.get(deploymentId)!;
}

export async function list() {
  const deployments = await prisma.deployment.findMany({
    include: {
      template: { select: { id: true, name: true, provider: true, category: true } },
      cloudConnection: { select: { id: true, name: true, provider: true } },
      createdBy: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return deployments.map(formatDeployment);
}

export async function get(id: string) {
  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: {
      template: { select: { id: true, name: true, provider: true, category: true } },
      cloudConnection: { select: { id: true, name: true, provider: true } },
      createdBy: { select: { id: true, displayName: true } },
    },
  });
  if (!deployment) throw new NotFoundError('Deployment');
  return formatDeployment(deployment);
}

export async function create(data: { name: string; templateId: string; cloudConnectionId: string; variables: Record<string, string> }, userId: string) {
  const template = await prisma.template.findUnique({ where: { id: data.templateId } });
  if (!template) throw new NotFoundError('Template');

  const connection = await prisma.cloudConnection.findUnique({ where: { id: data.cloudConnectionId } });
  if (!connection) throw new NotFoundError('Cloud connection');

  if (connection.provider !== template.provider) {
    throw new AppError(400, `Cloud connection provider (${connection.provider}) doesn't match template provider (${template.provider})`);
  }

  const deployment = await prisma.deployment.create({
    data: {
      name: data.name,
      templateId: data.templateId,
      cloudConnectionId: data.cloudConnectionId,
      variables: JSON.stringify(data.variables),
      createdById: userId,
    },
    include: {
      template: { select: { id: true, name: true, provider: true, category: true } },
      cloudConnection: { select: { id: true, name: true, provider: true } },
      createdBy: { select: { id: true, displayName: true } },
    },
  });

  // Enqueue plan + apply
  deploymentQueue.enqueue({
    deploymentId: deployment.id,
    action: 'plan_and_apply',
    execute: () => executePlanAndApply(deployment.id),
  });

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

    // Plan phase
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'planning' } });
    emitter.emit('log', { type: 'status', message: 'Planning...' });

    const planResult = await terraformRunner.plan(
      deployment.template.templatePath,
      variables,
      deployment.template.provider,
      credentials,
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

  await prisma.deployment.update({ where: { id }, data: { status: 'destroying' } });

  deploymentQueue.enqueue({
    deploymentId: id,
    action: 'destroy',
    execute: () => executeDestroy(id),
  });

  return get(id);
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

    emitter.emit('log', { type: 'status', message: 'Destroying...' });

    const result = await terraformRunner.destroy(
      deployment.template.templatePath,
      variables,
      deployment.template.provider,
      credentials,
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
    createdById: d.createdById,
    createdBy: d.createdBy,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}
