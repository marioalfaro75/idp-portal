import { SAML } from '@node-saml/node-saml';
import type { SamlConfig } from '@idp/shared';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

interface ProviderWithConfig {
  slug: string;
  decryptedConfig: SamlConfig;
}

function getCallbackUrl(slug: string): string {
  const base = process.env.SERVER_URL || process.env.CLIENT_URL?.replace(':5173', ':3001') || 'http://localhost:3001';
  return `${base}/api/federation/${slug}/callback`;
}

function getEntityId(slug: string): string {
  const base = process.env.SERVER_URL || process.env.CLIENT_URL?.replace(':5173', ':3001') || 'http://localhost:3001';
  return `${base}/api/federation/${slug}`;
}

function createSaml(provider: ProviderWithConfig): SAML {
  const config = provider.decryptedConfig;
  return new SAML({
    callbackUrl: getCallbackUrl(provider.slug),
    entryPoint: config.entryPoint,
    issuer: config.issuer || getEntityId(provider.slug),
    idpCert: config.cert,
    wantAuthnResponseSigned: config.wantAuthnResponseSigned ?? true,
    signatureAlgorithm: (config.signatureAlgorithm as 'sha1' | 'sha256' | 'sha512') || 'sha256',
  });
}

export async function getSamlLoginUrl(provider: ProviderWithConfig): Promise<string> {
  const saml = createSaml(provider);
  try {
    const url = await saml.getAuthorizeUrlAsync('', undefined, {});
    return url;
  } catch (err) {
    logger.error(`SAML login URL generation failed for ${provider.slug}`, { error: (err as Error).message });
    throw new AppError(502, 'Unable to reach identity provider');
  }
}

export async function handleSamlCallback(
  provider: ProviderWithConfig,
  body: { SAMLResponse: string; RelayState?: string },
): Promise<{ email: string; displayName: string; providerAccountId: string }> {
  const saml = createSaml(provider);

  let profile: Record<string, unknown>;
  try {
    const result = await saml.validatePostResponseAsync(body);
    profile = result.profile as Record<string, unknown>;
  } catch (err) {
    logger.error(`SAML validation failed for ${provider.slug}`, { error: (err as Error).message });
    throw new AppError(400, 'SAML validation failed');
  }

  if (!profile) {
    throw new AppError(400, 'SAML validation failed: no profile');
  }

  const email = (profile.email as string)
    || (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as string)
    || (profile.nameID as string);

  if (!email) {
    throw new AppError(400, 'SAML validation failed: no email in assertion');
  }

  const displayName = (profile.displayName as string)
    || (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] as string)
    || (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : undefined)
    || email;

  const providerAccountId = (profile.nameID as string) || email;

  return { email, displayName, providerAccountId };
}

export async function getSamlMetadata(provider: ProviderWithConfig): Promise<string> {
  const saml = createSaml(provider);
  return saml.generateServiceProviderMetadata(null, null);
}
