import { prisma } from '../../prisma';
import { encrypt, decrypt } from '../../utils/crypto';
import { NotFoundError, AppError } from '../../utils/errors';
import { issueSessionToken } from '../auth/auth.service';
import { logger } from '../../utils/logger';
import type {
  FederationProviderPublic,
  FederationProviderAdmin,
  FederationProviderDetail,
  FederationConfig,
  FederationProtocol,
  FederationProviderType,
  CreateFederationProviderRequest,
  UpdateFederationProviderRequest,
  AuthResponse,
} from '@idp/shared';

// --- CRUD ---

export async function listEnabled(): Promise<FederationProviderPublic[]> {
  const providers = await prisma.federationProvider.findMany({
    where: { enabled: true },
    orderBy: { name: 'asc' },
  });
  return providers.map((p) => ({
    slug: p.slug,
    name: p.name,
    protocol: p.protocol as FederationProtocol,
    providerType: p.providerType as FederationProviderType,
  }));
}

export async function listAll(): Promise<FederationProviderAdmin[]> {
  const providers = await prisma.federationProvider.findMany({
    include: { defaultRole: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  return providers.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    protocol: p.protocol as FederationProtocol,
    providerType: p.providerType as FederationProviderType,
    enabled: p.enabled,
    autoCreateUsers: p.autoCreateUsers,
    defaultRoleId: p.defaultRoleId,
    defaultRoleName: p.defaultRole.name,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getById(id: string): Promise<FederationProviderDetail> {
  const p = await prisma.federationProvider.findUnique({
    where: { id },
    include: { defaultRole: { select: { name: true } } },
  });
  if (!p) throw new NotFoundError('Federation provider');

  const config = JSON.parse(decrypt(p.config)) as FederationConfig;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    protocol: p.protocol as FederationProtocol,
    providerType: p.providerType as FederationProviderType,
    enabled: p.enabled,
    autoCreateUsers: p.autoCreateUsers,
    defaultRoleId: p.defaultRoleId,
    defaultRoleName: p.defaultRole.name,
    config,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function getBySlug(slug: string) {
  const p = await prisma.federationProvider.findUnique({
    where: { slug },
    include: { defaultRole: { select: { name: true } } },
  });
  if (!p) throw new NotFoundError('Federation provider');
  return { ...p, decryptedConfig: JSON.parse(decrypt(p.config)) as FederationConfig };
}

export async function create(data: CreateFederationProviderRequest): Promise<FederationProviderAdmin> {
  const encryptedConfig = encrypt(JSON.stringify(data.config));
  const p = await prisma.federationProvider.create({
    data: {
      name: data.name,
      slug: data.slug,
      protocol: data.protocol,
      providerType: data.providerType,
      enabled: data.enabled,
      autoCreateUsers: data.autoCreateUsers,
      defaultRoleId: data.defaultRoleId,
      config: encryptedConfig,
    },
    include: { defaultRole: { select: { name: true } } },
  });
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    protocol: p.protocol as FederationProtocol,
    providerType: p.providerType as FederationProviderType,
    enabled: p.enabled,
    autoCreateUsers: p.autoCreateUsers,
    defaultRoleId: p.defaultRoleId,
    defaultRoleName: p.defaultRole.name,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function update(id: string, data: UpdateFederationProviderRequest): Promise<FederationProviderAdmin> {
  const existing = await prisma.federationProvider.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Federation provider');

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.protocol !== undefined) updateData.protocol = data.protocol;
  if (data.providerType !== undefined) updateData.providerType = data.providerType;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.autoCreateUsers !== undefined) updateData.autoCreateUsers = data.autoCreateUsers;
  if (data.defaultRoleId !== undefined) updateData.defaultRoleId = data.defaultRoleId;
  if (data.config !== undefined) updateData.config = encrypt(JSON.stringify(data.config));

  const p = await prisma.federationProvider.update({
    where: { id },
    data: updateData,
    include: { defaultRole: { select: { name: true } } },
  });
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    protocol: p.protocol as FederationProtocol,
    providerType: p.providerType as FederationProviderType,
    enabled: p.enabled,
    autoCreateUsers: p.autoCreateUsers,
    defaultRoleId: p.defaultRoleId,
    defaultRoleName: p.defaultRole.name,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function remove(id: string): Promise<void> {
  const existing = await prisma.federationProvider.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Federation provider');
  await prisma.federationProvider.delete({ where: { id } });
}

// --- User Resolution ---

export async function resolveUser(
  provider: { providerType: string; autoCreateUsers: boolean; defaultRoleId: string },
  profile: { email: string; displayName: string; providerAccountId: string },
): Promise<AuthResponse> {
  let user = await prisma.user.findUnique({ where: { email: profile.email }, include: { role: true } });

  if (!user) {
    if (!provider.autoCreateUsers) {
      throw new AppError(403, 'Account not provisioned. Contact your administrator.');
    }
    user = await prisma.user.create({
      data: {
        email: profile.email,
        displayName: profile.displayName,
        roleId: provider.defaultRoleId,
      },
      include: { role: true },
    });
    logger.info(`Auto-created federation user: ${profile.email}`);
  }

  if (!user.isActive) {
    throw new AppError(403, 'Account has been disabled');
  }

  // Upsert OAuth account
  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: provider.providerType,
        providerAccountId: profile.providerAccountId,
      },
    },
    create: {
      provider: provider.providerType,
      providerAccountId: profile.providerAccountId,
      userId: user.id,
    },
    update: {},
  });

  return issueSessionToken(user.id);
}

// --- Legacy Migration ---

export async function migrateLegacyOidc(): Promise<void> {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['oidc.tenantId', 'oidc.clientId', 'oidc.clientSecret', 'oidc.redirectUri'] } },
  });
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;

  if (!config['oidc.tenantId'] || !config['oidc.clientId'] || !config['oidc.clientSecret']) {
    return; // Nothing to migrate
  }

  // Check if already migrated
  const existing = await prisma.federationProvider.findUnique({ where: { slug: 'azure-ad' } });
  if (existing) return;

  // Find default role (Viewer)
  const viewerRole = await prisma.role.findUnique({ where: { name: 'Viewer' } });
  if (!viewerRole) {
    logger.warn('Cannot migrate legacy OIDC: Viewer role not found');
    return;
  }

  const oidcConfig = {
    issuerUrl: `https://login.microsoftonline.com/${config['oidc.tenantId']}/v2.0`,
    clientId: config['oidc.clientId'],
    clientSecret: config['oidc.clientSecret'],
  };

  await prisma.federationProvider.create({
    data: {
      name: 'Azure AD',
      slug: 'azure-ad',
      protocol: 'oidc',
      providerType: 'azure-ad',
      enabled: true,
      autoCreateUsers: true,
      defaultRoleId: viewerRole.id,
      config: encrypt(JSON.stringify(oidcConfig)),
    },
  });

  // Clean up old settings
  await prisma.systemSetting.deleteMany({
    where: { key: { in: ['oidc.tenantId', 'oidc.clientId', 'oidc.clientSecret', 'oidc.redirectUri'] } },
  });

  logger.info('Migrated legacy OIDC settings to federation provider');
}
