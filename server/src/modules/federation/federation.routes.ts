import { Router } from 'express';
import express from 'express';
import crypto from 'node:crypto';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rate-limiter';
import { PERMISSIONS } from '@idp/shared';
import { createFederationProviderSchema, updateFederationProviderSchema } from './federation.validators';
import * as federationService from './federation.service';
import * as oidcHandler from './federation.oidc';
import * as samlHandler from './federation.saml';
import * as auditService from '../audit/audit.service';
import * as settingsService from '../settings/settings.service';

const router = Router();

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

// --- Public Routes ---

router.get('/providers', asyncHandler(async (_req, res) => {
  const providers = await federationService.listEnabled();
  const localPasswordDisabled = (await settingsService.get('auth.localPasswordDisabled')) === 'true';
  res.json({ providers, localPasswordDisabled });
}));

router.get('/:slug/login', authLimiter, asyncHandler(async (req, res) => {
  const provider = await federationService.getBySlug(req.params.slug);
  if (!provider.enabled) {
    res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent('Identity provider not available')}`);
    return;
  }

  if (provider.protocol === 'oidc') {
    const { url, state } = await oidcHandler.getOidcLoginUrl(provider as any);
    // Set state cookie for CSRF protection
    res.cookie('federation_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes
      secure: process.env.NODE_ENV === 'production',
    });
    res.redirect(url);
  } else if (provider.protocol === 'saml') {
    const state = crypto.randomUUID();
    res.cookie('federation_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    });
    const url = await samlHandler.getSamlLoginUrl(provider as any, state);
    res.redirect(url);
  } else {
    res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent('Unsupported protocol')}`);
  }
}));

// OIDC callback (GET)
router.get('/:slug/callback', authLimiter, asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  try {
    const provider = await federationService.getBySlug(slug);
    if (!provider.enabled) {
      res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent('Identity provider not available')}`);
      return;
    }

    if (provider.protocol !== 'oidc') {
      res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent('Invalid callback protocol')}`);
      return;
    }

    // Verify state cookie
    const expectedState = req.cookies?.federation_state;
    const actualState = req.query.state as string;
    if (!expectedState || expectedState !== actualState) {
      res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent('Invalid state parameter')}`);
      return;
    }
    res.clearCookie('federation_state');

    // Build the callback URL from the current request
    const protocol = req.protocol;
    const host = req.get('host');
    const callbackUrl = new URL(`${protocol}://${host}${req.originalUrl}`);

    const profile = await oidcHandler.handleOidcCallback(provider as any, callbackUrl, expectedState);
    const result = await federationService.resolveUser(
      { providerType: provider.providerType, autoCreateUsers: provider.autoCreateUsers, defaultRoleId: provider.defaultRoleId },
      profile,
    );

    await auditService.log({ action: 'federation_login', resource: 'auth', userId: result.user.id, ipAddress: req.ip, details: { provider: slug, protocol: 'oidc' } });

    const userParam = Buffer.from(JSON.stringify(result.user)).toString('base64');
    res.redirect(`${clientUrl()}/auth/callback?token=${result.token}&user=${userParam}`);
  } catch (err: any) {
    await auditService.log({ action: 'federation_login_failed', resource: 'auth', userId: null as any, ipAddress: req.ip, details: { provider: slug, protocol: 'oidc', error: err.message } }).catch(() => {});
    res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
}));

// SAML callback (POST with URL-encoded body)
router.post('/:slug/callback', authLimiter, express.urlencoded({ extended: false }), asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  try {
    const provider = await federationService.getBySlug(slug);
    if (!provider.enabled) {
      res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent('Identity provider not available')}`);
      return;
    }

    if (provider.protocol !== 'saml') {
      res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent('Invalid callback protocol')}`);
      return;
    }

    // Verify state cookie (CSRF protection)
    const expectedState = req.cookies?.federation_state;
    const actualState = req.body.RelayState;
    if (!expectedState || expectedState !== actualState) {
      res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent('Invalid state parameter')}`);
      return;
    }
    res.clearCookie('federation_state');

    const profile = await samlHandler.handleSamlCallback(provider as any, req.body);
    const result = await federationService.resolveUser(
      { providerType: provider.providerType, autoCreateUsers: provider.autoCreateUsers, defaultRoleId: provider.defaultRoleId },
      profile,
    );

    await auditService.log({ action: 'federation_login', resource: 'auth', userId: result.user.id, ipAddress: req.ip, details: { provider: slug, protocol: 'saml' } });

    const userParam = Buffer.from(JSON.stringify(result.user)).toString('base64');
    res.redirect(`${clientUrl()}/auth/callback?token=${result.token}&user=${userParam}`);
  } catch (err: any) {
    await auditService.log({ action: 'federation_login_failed', resource: 'auth', userId: null as any, ipAddress: req.ip, details: { provider: slug, protocol: 'saml', error: err.message } }).catch(() => {});
    res.redirect(`${clientUrl()}/auth/callback?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
}));

// SAML SP metadata
router.get('/:slug/metadata', asyncHandler(async (req, res) => {
  const provider = await federationService.getBySlug(req.params.slug);
  if (provider.protocol !== 'saml') {
    res.status(404).json({ error: { message: 'SAML metadata only available for SAML providers' } });
    return;
  }
  const xml = await samlHandler.getSamlMetadata(provider as any);
  res.type('application/xml').send(xml);
}));

// --- Admin Routes ---

router.get('/admin/providers', authenticate, authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (_req, res) => {
  const providers = await federationService.listAll();
  res.json(providers);
}));

// Export all providers (decrypted configs) — must be before /:id route
router.get('/admin/providers/export', authenticate, authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (req, res) => {
  const data = await federationService.exportAll();
  await auditService.log({ action: 'federation_export', resource: 'federation', userId: req.user!.sub, ipAddress: req.ip });
  res.json(data);
}));

// Import providers — must be before /:id route
router.post('/admin/providers/import', authenticate, authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body)) {
    res.status(400).json({ error: { message: 'Request body must be a JSON array of providers' } });
    return;
  }
  const count = await federationService.importProviders(req.body);
  await auditService.log({ action: 'federation_import', resource: 'federation', userId: req.user!.sub, ipAddress: req.ip, details: { count } });
  res.json({ imported: count });
}));

router.get('/admin/providers/:id', authenticate, authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (req, res) => {
  const provider = await federationService.getById(req.params.id);
  res.json(provider);
}));

router.post('/admin/providers', authenticate, authorize(PERMISSIONS.PORTAL_ADMIN), validate(createFederationProviderSchema), asyncHandler(async (req, res) => {
  const provider = await federationService.create(req.body);
  await auditService.log({ action: 'federation_provider_create', resource: 'federation', resourceId: provider.id, userId: req.user!.sub, ipAddress: req.ip, details: { name: provider.name, slug: provider.slug } });
  res.status(201).json(provider);
}));

router.put('/admin/providers/:id', authenticate, authorize(PERMISSIONS.PORTAL_ADMIN), validate(updateFederationProviderSchema), asyncHandler(async (req, res) => {
  const provider = await federationService.update(req.params.id, req.body);
  await auditService.log({ action: 'federation_provider_update', resource: 'federation', resourceId: provider.id, userId: req.user!.sub, ipAddress: req.ip, details: { name: provider.name } });
  res.json(provider);
}));

router.delete('/admin/providers/:id', authenticate, authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (req, res) => {
  await auditService.log({ action: 'federation_provider_delete', resource: 'federation', resourceId: req.params.id, userId: req.user!.sub, ipAddress: req.ip });
  await federationService.remove(req.params.id);
  res.status(204).end();
}));

export default router;
