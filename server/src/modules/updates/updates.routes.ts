import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '@idp/shared';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './updates.service';

const router = Router();

router.use(authenticate);

router.get(
  '/check',
  authorize(PERMISSIONS.PORTAL_ADMIN),
  asyncHandler(async (_req, res) => {
    const result = await service.checkForUpdates();
    res.json(result);
  })
);

export default router;
