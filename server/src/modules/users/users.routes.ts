import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS, createUserSchema, updateUserSchema, setUserGroupsSchema, updateProfileSchema } from '@idp/shared';
import * as usersService from './users.service';
import * as auditService from '../audit/audit.service';
import { prisma } from '../../prisma';

const router = Router();

router.use(authenticate);

router.patch('/me', validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const user = await usersService.updateSelf(req.user!.sub, req.body);
  res.json(user);
}));

router.get('/', authorize(PERMISSIONS.USERS_LIST), asyncHandler(async (_req, res) => {
  const users = await usersService.listUsers();
  res.json(users);
}));

router.get('/:id', authorize(PERMISSIONS.USERS_LIST), asyncHandler(async (req, res) => {
  const user = await usersService.getUser(req.params.id);
  res.json(user);
}));

router.post('/', authorize(PERMISSIONS.USERS_CREATE), validate(createUserSchema), asyncHandler(async (req, res) => {
  const user = await usersService.createUser(req.body);
  await auditService.log({ action: 'create', resource: 'user', resourceId: user.id, userId: req.user!.sub, ipAddress: req.ip, details: { email: user.email, displayName: user.displayName } });
  res.status(201).json(user);
}));

router.put('/:id', authorize(PERMISSIONS.USERS_UPDATE), validate(updateUserSchema), asyncHandler(async (req, res) => {
  const callerId = req.user!.sub;
  const targetId = req.params.id;

  // Prevent self-role-change
  if (req.body.roleId && targetId === callerId) {
    res.status(403).json({ error: { message: 'Cannot change your own role' } });
    return;
  }

  // Prevent self-deactivation
  if (req.body.isActive === false && targetId === callerId) {
    res.status(403).json({ error: { message: 'Cannot deactivate your own account' } });
    return;
  }

  // Prevent non-Portal-Admins from assigning a role that contains portal.admin
  if (req.body.roleId && !req.user!.permissions.includes(PERMISSIONS.PORTAL_ADMIN)) {
    const targetRole = await prisma.role.findUnique({ where: { id: req.body.roleId } });
    if (targetRole) {
      const rolePermissions: string[] = JSON.parse(targetRole.permissions);
      if (rolePermissions.includes(PERMISSIONS.PORTAL_ADMIN)) {
        res.status(403).json({ error: { message: 'Only Portal Admins can assign roles with portal.admin permission' } });
        return;
      }
    }
  }

  const user = await usersService.updateUser(targetId, req.body);

  // Strip password from audit log (Fix 6)
  const { password, ...auditDetails } = req.body;
  await auditService.log({ action: 'update', resource: 'user', resourceId: targetId, userId: callerId, ipAddress: req.ip, details: auditDetails });
  res.json(user);
}));

router.delete('/:id', authorize(PERMISSIONS.USERS_DELETE), asyncHandler(async (req, res) => {
  // Prevent self-deletion
  if (req.params.id === req.user!.sub) {
    res.status(403).json({ error: { message: 'Cannot delete your own account' } });
    return;
  }

  await usersService.deleteUser(req.params.id);
  await auditService.log({ action: 'delete', resource: 'user', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip });
  res.status(204).end();
}));

router.put('/:id/groups', authorize(PERMISSIONS.USERS_UPDATE), validate(setUserGroupsSchema), asyncHandler(async (req, res) => {
  const user = await usersService.setUserGroups(req.params.id, req.body.groupIds);
  await auditService.log({ action: 'set_groups', resource: 'user', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip, details: { groupIds: req.body.groupIds } });
  res.json(user);
}));

export default router;
