import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rate-limiter';
import { loginSchema, setupSchema, changePasswordSchema } from '@idp/shared';
import * as authService from './auth.service';
import * as auditService from '../audit/audit.service';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  await auditService.log({ action: 'login', resource: 'auth', userId: result.user.id, ipAddress: req.ip, details: { email: req.body.email } });
  res.json(result);
}));

router.post('/setup', authLimiter, validate(setupSchema), asyncHandler(async (req, res) => {
  const result = await authService.setup(req.body.email, req.body.password, req.body.displayName);
  await auditService.log({ action: 'setup', resource: 'auth', userId: result.user.id, ipAddress: req.ip, details: { email: req.body.email } });
  res.status(201).json(result);
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await authService.logout(req.user!.jti);
  await auditService.log({ action: 'logout', resource: 'auth', userId: req.user!.sub, ipAddress: req.ip });
  res.json({ message: 'Logged out' });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user!.sub);
  res.json(user);
}));

router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(async (req, res) => {
  await authService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
  await auditService.log({ action: 'change_password', resource: 'auth', userId: req.user!.sub, ipAddress: req.ip });
  res.json({ message: 'Password changed successfully' });
}));

router.get('/setup-status', asyncHandler(async (_req, res) => {
  const complete = await authService.isSetupComplete();
  res.json({ setupComplete: complete });
}));

export default router;
