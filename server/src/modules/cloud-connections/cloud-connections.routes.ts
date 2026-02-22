import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS, createCloudConnectionSchema, updateCloudConnectionSchema } from '@idp/shared';
import * as service from './cloud-connections.service';
import * as auditService from '../audit/audit.service';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.CLOUD_CONNECTIONS_LIST), asyncHandler(async (_req, res) => {
  const connections = await service.list();
  res.json(connections);
}));

router.get('/:id', authorize(PERMISSIONS.CLOUD_CONNECTIONS_LIST), asyncHandler(async (req, res) => {
  const connection = await service.get(req.params.id);
  res.json(connection);
}));

router.post('/test', authorize(PERMISSIONS.CLOUD_CONNECTIONS_CREATE), validate(createCloudConnectionSchema), asyncHandler(async (req, res) => {
  const result = await service.testCredentials(req.body.provider, req.body.credentials as Record<string, unknown>);
  res.json(result);
}));

router.post('/', authorize(PERMISSIONS.CLOUD_CONNECTIONS_CREATE), validate(createCloudConnectionSchema), asyncHandler(async (req, res) => {
  const connection = await service.create(req.body, req.user!.sub);
  await auditService.log({ action: 'create', resource: 'cloud_connection', resourceId: connection.id, userId: req.user!.sub, ipAddress: req.ip });
  res.status(201).json(connection);
}));

router.put('/:id', authorize(PERMISSIONS.CLOUD_CONNECTIONS_UPDATE), validate(updateCloudConnectionSchema), asyncHandler(async (req, res) => {
  const connection = await service.update(req.params.id, req.body);
  await auditService.log({ action: 'update', resource: 'cloud_connection', resourceId: connection.id, userId: req.user!.sub, ipAddress: req.ip });
  res.json(connection);
}));

router.delete('/:id', authorize(PERMISSIONS.CLOUD_CONNECTIONS_DELETE), asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  await auditService.log({ action: 'delete', resource: 'cloud_connection', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip });
  res.status(204).end();
}));

router.post('/:id/validate', authorize(PERMISSIONS.CLOUD_CONNECTIONS_LIST), asyncHandler(async (req, res) => {
  const result = await service.validate(req.params.id);
  res.json(result);
}));

export default router;
