import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as service from './help.service';

const router = Router();

router.use(authenticate);

router.get('/articles', (_req, res) => {
  const articles = service.getHelpArticles();
  res.json(articles);
});

router.post('/refresh', (_req, res) => {
  const articles = service.refreshHelpArticles();
  res.json(articles);
});

export default router;
