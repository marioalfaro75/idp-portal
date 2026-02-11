import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '@idp/shared';
import * as auditService from './audit.service';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.AUDIT_LOGS_VIEW), asyncHandler(async (req, res) => {
  const result = await auditService.list({
    action: req.query.action as string,
    resource: req.query.resource as string,
    userId: req.query.userId as string,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json(result);
}));

export default router;
