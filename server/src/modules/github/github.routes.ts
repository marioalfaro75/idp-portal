import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS, dispatchWorkflowSchema, saveGitHubAppConfigSchema } from '@idp/shared';
import * as service from './github.service';
import * as auditService from '../audit/audit.service';

const router = Router();

router.use(authenticate);

// App status — any user with GITHUB_MANAGE
router.get('/status', authorize(PERMISSIONS.GITHUB_MANAGE), asyncHandler(async (_req, res) => {
  const status = await service.getAppStatus();
  res.json(status);
}));

// Admin-only: save app config
router.post('/app/config', authorize(PERMISSIONS.PORTAL_ADMIN), validate(saveGitHubAppConfigSchema), asyncHandler(async (req, res) => {
  await service.saveAppConfig(req.body.appId, req.body.installationId, req.body.privateKey);
  await auditService.log({ action: 'configure', resource: 'github_app', userId: req.user!.sub, ipAddress: req.ip });
  res.json({ message: 'GitHub App configured' });
}));

// Admin-only: remove app config
router.delete('/app/config', authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (req, res) => {
  await service.removeAppConfig();
  await auditService.log({ action: 'remove', resource: 'github_app', userId: req.user!.sub, ipAddress: req.ip });
  res.status(204).end();
}));

// Admin-only: test app connection
router.get('/app/test', authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (_req, res) => {
  const result = await service.testAppConnection();
  res.json(result);
}));

// Repos, workflows, dispatch — require GITHUB_MANAGE
router.get('/repos', authorize(PERMISSIONS.GITHUB_MANAGE), asyncHandler(async (_req, res) => {
  const repos = await service.listRepos();
  res.json(repos);
}));

router.get('/repos/:owner/:repo/workflows', authorize(PERMISSIONS.GITHUB_MANAGE), asyncHandler(async (req, res) => {
  const workflows = await service.listWorkflows(req.params.owner, req.params.repo);
  res.json(workflows);
}));

router.post('/dispatch', authorize(PERMISSIONS.GITHUB_MANAGE), validate(dispatchWorkflowSchema), asyncHandler(async (req, res) => {
  await service.dispatchWorkflow(req.body.owner, req.body.repo, req.body.workflowId, req.body.ref, req.body.inputs);
  await auditService.log({ action: 'dispatch_workflow', resource: 'github', userId: req.user!.sub, ipAddress: req.ip, details: { owner: req.body.owner, repo: req.body.repo, workflow: req.body.workflowId } });
  res.json({ message: 'Workflow dispatched' });
}));

export default router;
