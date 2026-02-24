import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS, createGitHubConnectionSchema, dispatchWorkflowSchema } from '@idp/shared';
import * as service from './github.service';
import * as auditService from '../audit/audit.service';

const router = Router();

router.use(authenticate);
router.use(authorize(PERMISSIONS.GITHUB_MANAGE));

router.get('/connection', asyncHandler(async (req, res) => {
  const connection = await service.getConnection(req.user!.sub);
  res.json(connection);
}));

router.post('/connection', validate(createGitHubConnectionSchema), asyncHandler(async (req, res) => {
  const connection = await service.connect(req.body.token, req.user!.sub);
  await auditService.log({ action: 'connect', resource: 'github', userId: req.user!.sub, ipAddress: req.ip });
  res.status(201).json(connection);
}));

router.delete('/connection', asyncHandler(async (req, res) => {
  await service.disconnect(req.user!.sub);
  await auditService.log({ action: 'disconnect', resource: 'github', userId: req.user!.sub, ipAddress: req.ip });
  res.status(204).end();
}));

router.get('/connection/test', asyncHandler(async (req, res) => {
  const result = await service.testConnection(req.user!.sub);
  res.json(result);
}));

router.patch('/connection', validate(createGitHubConnectionSchema), asyncHandler(async (req, res) => {
  const connection = await service.connect(req.body.token, req.user!.sub);
  await auditService.log({ action: 'update_token', resource: 'github', userId: req.user!.sub, ipAddress: req.ip });
  res.json(connection);
}));

router.get('/usage', asyncHandler(async (req, res) => {
  const usage = await service.getUsageStats(req.user!.sub);
  res.json(usage);
}));

router.get('/repos', asyncHandler(async (req, res) => {
  const repos = await service.listRepos(req.user!.sub);
  res.json(repos);
}));

router.get('/repos/:owner/:repo/workflows', asyncHandler(async (req, res) => {
  const workflows = await service.listWorkflows(req.user!.sub, req.params.owner, req.params.repo);
  res.json(workflows);
}));

router.post('/dispatch', validate(dispatchWorkflowSchema), asyncHandler(async (req, res) => {
  await service.dispatchWorkflow(req.user!.sub, req.body.owner, req.body.repo, req.body.workflowId, req.body.ref, req.body.inputs);
  await auditService.log({ action: 'dispatch_workflow', resource: 'github', userId: req.user!.sub, ipAddress: req.ip, details: { owner: req.body.owner, repo: req.body.repo, workflow: req.body.workflowId } });
  res.json({ message: 'Workflow dispatched' });
}));

export default router;
