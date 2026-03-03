import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS, createDeploymentSchema } from '@idp/shared';
import * as service from './deployments.service';
import * as auditService from '../audit/audit.service';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@idp/shared';
import { prisma } from '../../prisma';

const router = Router();

// Track active SSE connections per user
const sseConnections = new Map<string, number>();
const MAX_SSE_PER_USER = 10;

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.DEPLOYMENTS_LIST), asyncHandler(async (req, res) => {
  const deployments = await service.list(req.user!);
  res.json(deployments);
}));

router.delete('/stale', authorize(PERMISSIONS.DEPLOYMENTS_DESTROY), asyncHandler(async (req, res) => {
  const result = await service.cleanupStale();
  await auditService.log({ action: 'cleanup_stale', resource: 'deployment', resourceId: null as any, userId: req.user!.sub, ipAddress: req.ip, details: { deleted: result.deleted } });
  res.json(result);
}));

router.delete('/failed', authorize(PERMISSIONS.DEPLOYMENTS_DESTROY), asyncHandler(async (req, res) => {
  const result = await service.purgeFailed();
  await auditService.log({ action: 'purge_failed', resource: 'deployment', resourceId: null as any, userId: req.user!.sub, ipAddress: req.ip, details: { deleted: result.deleted } });
  res.json(result);
}));

router.delete('/:id', authorize(PERMISSIONS.DEPLOYMENTS_DESTROY), asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  await auditService.log({ action: 'delete', resource: 'deployment', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip });
  res.status(204).send();
}));

router.get('/:id', authorize(PERMISSIONS.DEPLOYMENTS_LIST), asyncHandler(async (req, res) => {
  const deployment = await service.get(req.params.id, req.user!);
  res.json(deployment);
}));

router.post('/', authorize(PERMISSIONS.DEPLOYMENTS_CREATE), validate(createDeploymentSchema), asyncHandler(async (req, res) => {
  const deployment = await service.create(req.body, req.user!);
  await auditService.log({ action: 'create', resource: 'deployment', resourceId: deployment.id, userId: req.user!.sub, ipAddress: req.ip, details: { name: deployment.name } });
  res.status(201).json(deployment);
}));

router.post('/:id/destroy', authorize(PERMISSIONS.DEPLOYMENTS_DESTROY), asyncHandler(async (req, res) => {
  const deployment = await service.destroyDeployment(req.params.id, req.user!.sub);
  await auditService.log({ action: 'destroy', resource: 'deployment', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip });
  res.json(deployment);
}));

router.post('/:id/rollback', authorize(PERMISSIONS.DEPLOYMENTS_DESTROY), asyncHandler(async (req, res) => {
  const deployment = await service.rollbackDeployment(req.params.id, req.user!.sub);
  await auditService.log({ action: 'rollback', resource: 'deployment', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip });
  res.json(deployment);
}));

// SSE endpoint for deployment logs - auth via query param since EventSource can't set headers
router.get('/:id/logs', async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(401).json({ error: { message: 'No token' } });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    res.status(401).json({ error: { message: 'Invalid token' } });
    return;
  }

  // Session validation (same as authenticate middleware)
  const session = await prisma.session.findUnique({ where: { jti: payload.jti } });
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: { message: 'Session expired or revoked' } });
    return;
  }

  // Permission check
  const permissions = payload.permissions || [];
  if (!permissions.includes(PERMISSIONS.DEPLOYMENTS_LIST)) {
    res.status(403).json({ error: { message: 'Insufficient permissions' } });
    return;
  }

  // Enforce per-user SSE connection limit
  const userId = payload.sub;
  const currentCount = sseConnections.get(userId) || 0;
  if (currentCount >= MAX_SSE_PER_USER) {
    res.status(429).json({ error: { message: 'Too many SSE connections' } });
    return;
  }
  sseConnections.set(userId, currentCount + 1);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const emitter = service.getLogEmitter(req.params.id);
  const handler = (data: any) => {
    res.write(`data: ${JSON.stringify({ ...data, timestamp: new Date().toISOString() })}\n\n`);
    if (data.type === 'complete') {
      res.end();
    }
  };

  emitter.on('log', handler);
  req.on('close', () => {
    emitter.removeListener('log', handler);
    const count = sseConnections.get(userId) || 1;
    if (count <= 1) sseConnections.delete(userId);
    else sseConnections.set(userId, count - 1);
  });
});

export default router;
