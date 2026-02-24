import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma';
import { NotFoundError, ConflictError } from '../../utils/errors';
import type { CreateUserRequest, UpdateUserRequest } from '@idp/shared';

export async function listUsers() {
  const users = await prisma.user.findMany({
    include: { role: true, groupMemberships: { include: { group: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return users.map(formatUser);
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, include: { role: true, groupMemberships: { include: { group: true } } } });
  if (!user) throw new NotFoundError('User');
  return formatUser(user);
}

export async function createUser(data: CreateUserRequest) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError('Email already in use');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { email: data.email, displayName: data.displayName, passwordHash, roleId: data.roleId },
    include: { role: true },
  });
  return formatUser(user);
}

export async function updateUser(id: string, data: UpdateUserRequest) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email already in use');
  }

  const updateData: Record<string, unknown> = {};
  if (data.email) updateData.email = data.email;
  if (data.displayName) updateData.displayName = data.displayName;
  if (data.roleId) updateData.roleId = data.roleId;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { role: true },
  });
  return formatUser(updated);
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');
  await prisma.user.delete({ where: { id } });
}

export async function setUserGroups(userId: string, groupIds: string[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  await prisma.$transaction([
    prisma.groupMember.deleteMany({ where: { userId } }),
    ...(groupIds.length > 0
      ? [prisma.groupMember.createMany({ data: groupIds.map((groupId) => ({ groupId, userId })) })]
      : []),
  ]);

  return getUser(userId);
}

function formatUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isActive: user.isActive,
    roleId: user.roleId,
    role: user.role ? {
      id: user.role.id,
      name: user.role.name,
      permissions: JSON.parse(user.role.permissions),
      isSystem: user.role.isSystem,
    } : undefined,
    groups: user.groupMemberships?.map((gm: any) => ({ id: gm.group.id, name: gm.group.name })) || [],
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
