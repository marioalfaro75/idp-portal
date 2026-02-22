import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '@idp/shared';
import * as groupsService from './groups.service';
import * as auditService from '../audit/audit.service';
import {
  createGroupSchema,
  updateGroupSchema,
  updateGroupMembersSchema,
  updateGroupTemplatesSchema,
} from './groups.validators';

const router = Router();

router.use(authenticate);
router.use(authorize(PERMISSIONS.GROUPS_MANAGE));

router.get('/', asyncHandler(async (_req, res) => {
  const groups = await groupsService.listGroups();
  res.json(groups);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const group = await groupsService.getGroup(req.params.id);
  res.json(group);
}));

router.post('/', validate(createGroupSchema), asyncHandler(async (req, res) => {
  const group = await groupsService.createGroup(req.body);
  await auditService.log({ action: 'create', resource: 'group', resourceId: group.id, userId: req.user!.sub, ipAddress: req.ip, details: { name: group.name } });
  res.status(201).json(group);
}));

router.put('/:id', validate(updateGroupSchema), asyncHandler(async (req, res) => {
  const group = await groupsService.updateGroup(req.params.id, req.body);
  await auditService.log({ action: 'update', resource: 'group', resourceId: group.id, userId: req.user!.sub, ipAddress: req.ip, details: req.body });
  res.json(group);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await groupsService.deleteGroup(req.params.id);
  await auditService.log({ action: 'delete', resource: 'group', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip });
  res.status(204).end();
}));

router.put('/:id/members', validate(updateGroupMembersSchema), asyncHandler(async (req, res) => {
  const group = await groupsService.setMembers(req.params.id, req.body.userIds);
  await auditService.log({ action: 'set_members', resource: 'group', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip, details: { memberCount: req.body.userIds.length } });
  res.json(group);
}));

router.put('/:id/templates', validate(updateGroupTemplatesSchema), asyncHandler(async (req, res) => {
  const group = await groupsService.setTemplates(req.params.id, req.body.templateIds);
  await auditService.log({ action: 'set_templates', resource: 'group', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip, details: { templateCount: req.body.templateIds.length } });
  res.json(group);
}));

export default router;
