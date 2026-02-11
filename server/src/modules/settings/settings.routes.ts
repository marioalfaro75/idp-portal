import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '@idp/shared';
import * as settingsService from './settings.service';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (_req, res) => {
  const settings = await settingsService.getAll();
  res.json(settings);
}));

router.put('/:key', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (req, res) => {
  await settingsService.set(req.params.key, req.body.value);
  res.json({ key: req.params.key, value: req.body.value });
}));

router.delete('/:key', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (req, res) => {
  await settingsService.del(req.params.key);
  res.status(204).end();
}));

export default router;
