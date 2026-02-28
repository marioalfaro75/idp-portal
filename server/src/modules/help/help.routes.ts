import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import * as service from './help.service';

const router = Router();

router.use(authenticate);

router.get('/articles', asyncHandler(async (_req, res) => {
  const articles = await service.getHelpArticles();
  res.json(articles);
}));

router.post('/refresh', asyncHandler(async (_req, res) => {
  const articles = await service.refreshHelpArticles();
  res.json(articles);
}));

export default router;
