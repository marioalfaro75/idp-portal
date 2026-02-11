import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rate-limiter';
import { loginSchema, setupSchema } from '@idp/shared';
import * as authService from './auth.service';
import * as oidcService from './oidc.service';
import * as auditService from '../audit/audit.service';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  res.json(result);
}));

router.post('/setup', authLimiter, validate(setupSchema), asyncHandler(async (req, res) => {
  const result = await authService.setup(req.body.email, req.body.password, req.body.displayName);
  res.status(201).json(result);
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await authService.logout(req.user!.jti);
  res.json({ message: 'Logged out' });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user!.sub);
  res.json(user);
}));

router.get('/setup-status', asyncHandler(async (_req, res) => {
  const complete = await authService.isSetupComplete();
  res.json({ setupComplete: complete });
}));

// OIDC routes
router.get('/oidc/login', asyncHandler(async (_req, res) => {
  const url = await oidcService.getAuthorizationUrl();
  res.json({ url });
}));

router.get('/oidc/callback', asyncHandler(async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/callback?error=No+authorization+code`);
    return;
  }
  try {
    const { token, user } = await oidcService.handleCallback(code);
    await auditService.log({ action: 'oidc_login', resource: 'auth', userId: user.id, ipAddress: req.ip });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const userParam = Buffer.from(JSON.stringify(user)).toString('base64');
    res.redirect(`${clientUrl}/auth/callback?token=${token}&user=${userParam}`);
  } catch (err: any) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent(err.message)}`);
  }
}));

export default router;
