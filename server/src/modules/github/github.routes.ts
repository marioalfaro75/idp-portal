import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS, dispatchWorkflowSchema, saveGitHubAppConfigSchema, createRepoSchema } from '@idp/shared';
import * as service from './github.service';
import { testPrivateKey } from './github-app';
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

// Admin-only: test a private key before saving
router.post('/app/test-key', authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (req, res) => {
  const { appId, installationId, privateKey } = req.body;
  if (!appId || !installationId || !privateKey) {
    res.status(400).json({ error: { message: 'appId, installationId, and privateKey are required' } });
    return;
  }
  const result = await testPrivateKey(appId, installationId, privateKey);
  res.json(result);
}));

// Repos, workflows, dispatch — require GITHUB_MANAGE
router.get('/repos', authorize(PERMISSIONS.GITHUB_MANAGE), asyncHandler(async (_req, res) => {
  const repos = await service.listRepos();
  res.json(repos);
}));

router.post('/repos', authorize(PERMISSIONS.GITHUB_MANAGE), validate(createRepoSchema), asyncHandler(async (req, res) => {
  const { name, description, isPrivate } = req.body;
  const result = await service.createRepo(name, description || '', isPrivate);
  await auditService.log({ action: 'create', resource: 'github_repo', userId: req.user!.sub, ipAddress: req.ip, details: { repo: result.fullName } });
  res.status(201).json(result);
}));

router.delete('/repos/:owner/:repo', authorize(PERMISSIONS.GITHUB_MANAGE), asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  await service.deleteRepo(owner, repo);
  await auditService.log({ action: 'delete', resource: 'github_repo', userId: req.user!.sub, ipAddress: req.ip, details: { repo: `${owner}/${repo}` } });
  res.status(204).end();
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
