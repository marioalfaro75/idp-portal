import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS, createUserSchema, updateUserSchema, setUserGroupsSchema, updateProfileSchema } from '@idp/shared';
import * as usersService from './users.service';

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
  res.status(201).json(user);
}));

router.put('/:id', authorize(PERMISSIONS.USERS_UPDATE), validate(updateUserSchema), asyncHandler(async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body);
  res.json(user);
}));

router.delete('/:id', authorize(PERMISSIONS.USERS_DELETE), asyncHandler(async (req, res) => {
  await usersService.deleteUser(req.params.id);
  res.status(204).end();
}));

router.put('/:id/groups', authorize(PERMISSIONS.USERS_UPDATE), validate(setUserGroupsSchema), asyncHandler(async (req, res) => {
  const user = await usersService.setUserGroups(req.params.id, req.body.groupIds);
  res.json(user);
}));

export default router;
