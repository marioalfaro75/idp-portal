import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS, createRoleSchema, updateRoleSchema } from '@idp/shared';
import * as rolesService from './roles.service';
import * as auditService from '../audit/audit.service';

const router = Router();

router.use(authenticate);

/** Block non-Portal-Admins from assigning portal.admin permission to roles */
function checkPortalAdminPermission(req: import('express').Request, res: import('express').Response): boolean {
  if (
    req.body.permissions?.includes(PERMISSIONS.PORTAL_ADMIN) &&
    !req.user?.permissions?.includes(PERMISSIONS.PORTAL_ADMIN)
  ) {
    res.status(403).json({ error: { message: 'Only Portal Admins can assign the portal.admin permission' } });
    return false;
  }
  return true;
}

router.get('/', asyncHandler(async (_req, res) => {
  const roles = await rolesService.listRoles();
  res.json(roles);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const role = await rolesService.getRole(req.params.id);
  res.json(role);
}));

router.post('/', authorize(PERMISSIONS.ROLES_MANAGE), validate(createRoleSchema), asyncHandler(async (req, res) => {
  if (!checkPortalAdminPermission(req, res)) return;
  const role = await rolesService.createRole(req.body);
  await auditService.log({ action: 'create', resource: 'role', resourceId: role.id, userId: req.user!.sub, ipAddress: req.ip, details: { name: role.name } });
  res.status(201).json(role);
}));

router.put('/:id', authorize(PERMISSIONS.ROLES_MANAGE), validate(updateRoleSchema), asyncHandler(async (req, res) => {
  if (!checkPortalAdminPermission(req, res)) return;
  const oldRole = await rolesService.getRole(req.params.id);
  const role = await rolesService.updateRole(req.params.id, req.body);
  await auditService.log({
    action: 'update', resource: 'role', resourceId: req.params.id,
    userId: req.user!.sub, ipAddress: req.ip,
    details: {
      name: req.body.name,
      permissionsBefore: oldRole.permissions,
      permissionsAfter: role.permissions,
    },
  });
  res.json(role);
}));

router.delete('/:id', authorize(PERMISSIONS.ROLES_MANAGE), asyncHandler(async (req, res) => {
  const oldRole = await rolesService.getRole(req.params.id);
  await rolesService.deleteRole(req.params.id);
  await auditService.log({
    action: 'delete', resource: 'role', resourceId: req.params.id,
    userId: req.user!.sub, ipAddress: req.ip,
    details: { name: oldRole.name, permissions: oldRole.permissions },
  });
  res.status(204).end();
}));

export default router;
