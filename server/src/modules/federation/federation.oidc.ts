import * as client from 'openid-client';
import crypto from 'crypto';
import type { OidcConfig } from '@idp/shared';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

interface ProviderWithConfig {
  slug: string;
  decryptedConfig: OidcConfig;
}

function getCallbackUrl(slug: string): string {
  const base = process.env.SERVER_URL || process.env.CLIENT_URL?.replace(':5173', ':3001') || 'http://localhost:3001';
  return `${base}/api/federation/${slug}/callback`;
}

export async function getOidcLoginUrl(provider: ProviderWithConfig): Promise<{ url: string; state: string }> {
  const config = provider.decryptedConfig;
  let issuerUrl = config.issuerUrl;

  // Ensure discovery URL has proper path
  if (!issuerUrl.endsWith('/.well-known/openid-configuration') && !issuerUrl.includes('/.well-known/')) {
    // openid-client will handle discovery automatically
  }

  let oidcConfig: client.Configuration;
  try {
    oidcConfig = await client.discovery(new URL(issuerUrl), config.clientId, config.clientSecret);
  } catch (err) {
    logger.error(`OIDC discovery failed for ${provider.slug}`, { error: (err as Error).message });
    throw new AppError(502, 'Unable to reach identity provider');
  }

  const state = crypto.randomBytes(32).toString('hex');
  const scopes = config.scopes || 'openid profile email';
  const redirectUri = getCallbackUrl(provider.slug);

  const parameters: Record<string, string> = {
    redirect_uri: redirectUri,
    scope: scopes,
    state,
  };

  const url = client.buildAuthorizationUrl(oidcConfig, parameters);

  return { url: url.href, state };
}

export async function handleOidcCallback(
  provider: ProviderWithConfig,
  callbackUrl: URL,
  expectedState: string,
): Promise<{ email: string; displayName: string; providerAccountId: string }> {
  const config = provider.decryptedConfig;

  let oidcConfig: client.Configuration;
  try {
    oidcConfig = await client.discovery(new URL(config.issuerUrl), config.clientId, config.clientSecret);
  } catch (err) {
    logger.error(`OIDC discovery failed for ${provider.slug}`, { error: (err as Error).message });
    throw new AppError(502, 'Unable to reach identity provider');
  }

  const redirectUri = getCallbackUrl(provider.slug);

  let tokens: Awaited<ReturnType<typeof client.authorizationCodeGrant>>;
  try {
    tokens = await client.authorizationCodeGrant(oidcConfig, callbackUrl, {
      expectedState,
      idTokenExpected: true,
    });
  } catch (err) {
    logger.error(`OIDC token exchange failed for ${provider.slug}`, { error: (err as Error).message });
    throw new AppError(400, 'OIDC authentication failed');
  }

  const claims = tokens.claims();
  if (!claims) {
    throw new AppError(400, 'OIDC authentication failed: no claims in token');
  }

  const email = (claims.email as string) || (claims.preferred_username as string);
  if (!email) {
    throw new AppError(400, 'OIDC authentication failed: no email in token');
  }

  const displayName = (claims.name as string) || email;
  const providerAccountId = claims.sub;

  return { email, displayName, providerAccountId };
}
