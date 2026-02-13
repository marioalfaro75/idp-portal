import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS, createServiceSchema, triggerWorkflowSchema } from '@idp/shared';
import * as service from './services.service';
import * as auditService from '../audit/audit.service';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.SERVICES_LIST), asyncHandler(async (req, res) => {
  const search = req.query.search as string | undefined;
  const services = await service.list({ search });
  res.json(services);
}));

router.get('/:id', authorize(PERMISSIONS.SERVICES_LIST), asyncHandler(async (req, res) => {
  const svc = await service.get(req.params.id);
  res.json(svc);
}));

router.post('/', authorize(PERMISSIONS.SERVICES_CREATE), validate(createServiceSchema), asyncHandler(async (req, res) => {
  const svc = await service.create(req.body, req.user!.sub);
  await auditService.log({
    action: 'create',
    resource: 'service',
    resourceId: svc.id,
    userId: req.user!.sub,
    ipAddress: req.ip,
    details: { name: svc.name },
  });
  res.status(201).json(svc);
}));

router.post('/:id/trigger', authorize(PERMISSIONS.SERVICES_MANAGE), validate(triggerWorkflowSchema), asyncHandler(async (req, res) => {
  const run = await service.triggerWorkflow(req.params.id, req.user!.sub, req.body.workflowName);
  await auditService.log({
    action: 'trigger_workflow',
    resource: 'service',
    resourceId: req.params.id,
    userId: req.user!.sub,
    ipAddress: req.ip,
  });
  res.status(201).json(run);
}));

router.post('/:id/runs/:runId/retry', authorize(PERMISSIONS.SERVICES_MANAGE), asyncHandler(async (req, res) => {
  const run = await service.retryWorkflow(req.params.id, req.params.runId, req.user!.sub);
  await auditService.log({
    action: 'retry_workflow',
    resource: 'service',
    resourceId: req.params.id,
    userId: req.user!.sub,
    ipAddress: req.ip,
    details: { runId: req.params.runId },
  });
  res.status(201).json(run);
}));

export default router;
