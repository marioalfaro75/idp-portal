import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../../prisma';
import { encrypt } from '../../utils/crypto';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

async function getOidcConfig() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['oidc.tenantId', 'oidc.clientId', 'oidc.clientSecret', 'oidc.redirectUri'] } },
  });
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;

  if (!config['oidc.tenantId'] || !config['oidc.clientId'] || !config['oidc.clientSecret']) {
    // Fall back to env vars
    const tenantId = process.env.AZURE_AD_TENANT_ID;
    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
    const redirectUri = process.env.AZURE_AD_REDIRECT_URI || 'http://localhost:3001/api/auth/oidc/callback';

    if (!tenantId || !clientId || !clientSecret) {
      throw new AppError(400, 'OIDC not configured');
    }

    return { tenantId, clientId, clientSecret, redirectUri };
  }

  return {
    tenantId: config['oidc.tenantId'],
    clientId: config['oidc.clientId'],
    clientSecret: config['oidc.clientSecret'],
    redirectUri: config['oidc.redirectUri'] || 'http://localhost:3001/api/auth/oidc/callback',
  };
}

function createMsalApp(config: Awaited<ReturnType<typeof getOidcConfig>>): ConfidentialClientApplication {
  const msalConfig: Configuration = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: config.clientSecret,
    },
  };
  return new ConfidentialClientApplication(msalConfig);
}

export async function getAuthorizationUrl(): Promise<string> {
  const config = await getOidcConfig();
  const msalApp = createMsalApp(config);

  const url = await msalApp.getAuthCodeUrl({
    scopes: ['openid', 'profile', 'email'],
    redirectUri: config.redirectUri,
    state: uuid(),
  });

  return url;
}

export async function handleCallback(code: string): Promise<{ token: string; user: any }> {
  const config = await getOidcConfig();
  const msalApp = createMsalApp(config);

  const result = await msalApp.acquireTokenByCode({
    code,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: config.redirectUri,
  });

  if (!result || !result.account) {
    throw new AppError(400, 'OIDC authentication failed');
  }

  const email = result.account.username;
  const displayName = result.account.name || email;
  const providerAccountId = result.account.localAccountId || result.account.homeAccountId;

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email }, include: { role: true } });

  if (!user) {
    // Auto-create with Viewer role
    const viewerRole = await prisma.role.findUnique({ where: { name: 'Viewer' } });
    if (!viewerRole) throw new AppError(500, 'Viewer role not found');

    user = await prisma.user.create({
      data: { email, displayName, roleId: viewerRole.id },
      include: { role: true },
    });
    logger.info(`Auto-created OIDC user: ${email}`);
  }

  // Upsert OAuth account
  const encryptedAccessToken = result.accessToken ? encrypt(result.accessToken) : null;

  await prisma.oAuthAccount.upsert({
    where: { provider_providerAccountId: { provider: 'azure-ad', providerAccountId } },
    create: {
      provider: 'azure-ad',
      providerAccountId,
      accessToken: encryptedAccessToken,
      userId: user.id,
    },
    update: {
      accessToken: encryptedAccessToken,
    },
  });

  // Issue JWT
  const jti = uuid();
  const permissions = JSON.parse(user.role.permissions) as string[];
  const jwtToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role.name, permissions, jti },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions,
  );

  const decoded = jwt.decode(jwtToken) as any;
  await prisma.session.create({ data: { jti, userId: user.id, expiresAt: new Date(decoded.exp * 1000) } });

  return {
    token: jwtToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions,
      },
    },
  };
}
