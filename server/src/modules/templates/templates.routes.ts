import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS, updateTemplateTagsSchema } from '@idp/shared';
import { validate } from '../../middleware/validate';
import * as service from './templates.service';
import * as auditService from '../audit/audit.service';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.TEMPLATES_LIST), asyncHandler(async (req, res) => {
  const templates = await service.list({
    provider: req.query.provider as string,
    category: req.query.category as string,
    search: req.query.search as string,
  }, req.user!);
  res.json(templates);
}));

router.get('/slug/:slug', authorize(PERMISSIONS.TEMPLATES_LIST), asyncHandler(async (req, res) => {
  const template = await service.getBySlug(req.params.slug, req.user!);
  res.json(template);
}));

router.patch('/:id/tags', authorize(PERMISSIONS.TEMPLATES_EDIT), validate(updateTemplateTagsSchema), asyncHandler(async (req, res) => {
  const template = await service.updateTags(req.params.id, req.body.tags);
  await auditService.log({ action: 'update_tags', resource: 'template', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip, details: { tags: req.body.tags } });
  res.json(template);
}));

router.get('/:id', authorize(PERMISSIONS.TEMPLATES_LIST), asyncHandler(async (req, res) => {
  const template = await service.get(req.params.id, req.user!);
  res.json(template);
}));

router.post('/sync', authorize(PERMISSIONS.TEMPLATES_SYNC), asyncHandler(async (req, res) => {
  const count = await service.sync();
  await auditService.log({ action: 'sync', resource: 'templates', userId: req.user!.sub, ipAddress: req.ip, details: { count } });
  res.json({ count });
}));

export default router;
