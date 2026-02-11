import { prisma } from '../../prisma';
import { NotFoundError } from '../../utils/errors';
import { encryptCredentials, decryptCredentials } from './credential-vault';
import { validateCredentials } from './provider-validators';
import type { CreateCloudConnectionRequest, UpdateCloudConnectionRequest } from '@idp/shared';

export async function list() {
  const connections = await prisma.cloudConnection.findMany({ orderBy: { createdAt: 'desc' } });
  return connections.map(formatConnection);
}

export async function get(id: string) {
  const conn = await prisma.cloudConnection.findUnique({ where: { id } });
  if (!conn) throw new NotFoundError('Cloud connection');
  return formatConnection(conn);
}

export async function create(data: CreateCloudConnectionRequest, userId: string) {
  const encrypted = encryptCredentials(data.credentials as Record<string, unknown>);
  const validation = await validateCredentials(data.provider, data.credentials as Record<string, unknown>);

  const conn = await prisma.cloudConnection.create({
    data: {
      name: data.name,
      provider: data.provider,
      encryptedCredentials: encrypted,
      status: validation.valid ? 'connected' : 'error',
      accountIdentifier: validation.accountId,
      createdById: userId,
    },
  });
  return formatConnection(conn);
}

export async function update(id: string, data: UpdateCloudConnectionRequest) {
  const conn = await prisma.cloudConnection.findUnique({ where: { id } });
  if (!conn) throw new NotFoundError('Cloud connection');

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.credentials) {
    updateData.encryptedCredentials = encryptCredentials(data.credentials as Record<string, unknown>);
    const validation = await validateCredentials(conn.provider, data.credentials as Record<string, unknown>);
    updateData.status = validation.valid ? 'connected' : 'error';
    updateData.accountIdentifier = validation.accountId;
  }

  const updated = await prisma.cloudConnection.update({ where: { id }, data: updateData });
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
    data: { status: result.valid ? 'connected' : 'error', accountIdentifier: result.accountId },
  });

  return result;
}

export async function getDecryptedCredentials(id: string) {
  const conn = await prisma.cloudConnection.findUnique({ where: { id } });
  if (!conn) throw new NotFoundError('Cloud connection');
  return { provider: conn.provider, credentials: decryptCredentials(conn.encryptedCredentials) };
}

function formatConnection(conn: any) {
  return {
    id: conn.id,
    name: conn.name,
    provider: conn.provider,
    status: conn.status,
    accountIdentifier: conn.accountIdentifier,
    createdById: conn.createdById,
    createdAt: conn.createdAt.toISOString(),
    updatedAt: conn.updatedAt.toISOString(),
  };
}
