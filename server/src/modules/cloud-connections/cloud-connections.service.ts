import { prisma } from '../../prisma';
import { NotFoundError } from '../../utils/errors';
import { encryptCredentials, decryptCredentials } from './credential-vault';
import { validateCredentials } from './provider-validators';
import type { CreateCloudConnectionRequest, UpdateCloudConnectionRequest } from '@idp/shared';

const connectionInclude = {
  createdBy: { select: { id: true, displayName: true } },
  _count: { select: { deployments: true } },
} as const;

function extractMetadata(provider: string, credentials: Record<string, unknown>): string {
  switch (provider) {
    case 'aws':
      return JSON.stringify({ region: credentials.region || '' });
    case 'gcp':
      return JSON.stringify({ projectId: credentials.projectId || '' });
    case 'azure':
      return JSON.stringify({
        subscriptionId: credentials.subscriptionId || '',
        tenantId: credentials.tenantId || '',
      });
    default:
      return '{}';
  }
}

export async function list() {
  const connections = await prisma.cloudConnection.findMany({
    orderBy: { createdAt: 'desc' },
    include: connectionInclude,
  });
  return connections.map(formatConnection);
}

export async function get(id: string) {
  const conn = await prisma.cloudConnection.findUnique({
    where: { id },
    include: connectionInclude,
  });
  if (!conn) throw new NotFoundError('Cloud connection');
  return formatConnection(conn);
}

export async function testCredentials(provider: string, credentials: Record<string, unknown>) {
  return validateCredentials(provider, credentials);
}

export async function create(data: CreateCloudConnectionRequest, userId: string) {
  const creds = data.credentials as unknown as Record<string, unknown>;
  const encrypted = encryptCredentials(creds);
  const validation = await validateCredentials(data.provider, creds);
  const metadata = extractMetadata(data.provider, creds);

  const conn = await prisma.cloudConnection.create({
    data: {
      name: data.name,
      provider: data.provider,
      encryptedCredentials: encrypted,
      status: validation.valid ? 'connected' : 'error',
      accountIdentifier: validation.accountId,
      validationMessage: validation.message,
      lastValidatedAt: new Date(),
      metadata,
      createdById: userId,
    },
    include: connectionInclude,
  });
  return formatConnection(conn);
}

export async function update(id: string, data: UpdateCloudConnectionRequest) {
  const conn = await prisma.cloudConnection.findUnique({ where: { id } });
  if (!conn) throw new NotFoundError('Cloud connection');

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.credentials) {
    const creds = data.credentials as unknown as Record<string, unknown>;
    updateData.encryptedCredentials = encryptCredentials(creds);
    const validation = await validateCredentials(conn.provider, creds);
    updateData.status = validation.valid ? 'connected' : 'error';
    updateData.accountIdentifier = validation.accountId;
    updateData.validationMessage = validation.message;
    updateData.lastValidatedAt = new Date();
    updateData.metadata = extractMetadata(conn.provider, creds);
  }

  const updated = await prisma.cloudConnection.update({
    where: { id },
    data: updateData,
    include: connectionInclude,
  });
  return formatConnection(updated);
}

export async function remove(id: string) {
  const conn = await prisma.cloudConnection.findUnique({ where: { id } });
  if (!conn) throw new NotFoundError('Cloud connection');
  await prisma.cloudConnection.delete({ where: { id } });
}

export async function validate(id: string) {
  const conn = await prisma.cloudConnection.findUnique({ where: { id } });
  if (!conn) throw new NotFoundError('Cloud connection');

  const credentials = decryptCredentials(conn.encryptedCredentials);
  const result = await validateCredentials(conn.provider, credentials);

  await prisma.cloudConnection.update({
    where: { id },
    data: {
      status: result.valid ? 'connected' : 'error',
      accountIdentifier: result.accountId,
      validationMessage: result.message,
      lastValidatedAt: new Date(),
    },
  });

  return result;
}

export async function getDecryptedCredentials(id: string) {
  const conn = await prisma.cloudConnection.findUnique({ where: { id } });
  if (!conn) throw new NotFoundError('Cloud connection');
  return { provider: conn.provider, credentials: decryptCredentials(conn.encryptedCredentials) };
}

function formatConnection(conn: any) {
  let metadata = {};
  try { metadata = JSON.parse(conn.metadata || '{}'); } catch { /* use default */ }

  return {
    id: conn.id,
    name: conn.name,
    provider: conn.provider,
    status: conn.status,
    accountIdentifier: conn.accountIdentifier,
    validationMessage: conn.validationMessage || '',
    lastValidatedAt: conn.lastValidatedAt ? conn.lastValidatedAt.toISOString() : null,
    metadata,
    deploymentCount: conn._count?.deployments ?? 0,
    createdById: conn.createdById,
    createdBy: conn.createdBy ?? undefined,
    createdAt: conn.createdAt.toISOString(),
    updatedAt: conn.updatedAt.toISOString(),
  };
}
