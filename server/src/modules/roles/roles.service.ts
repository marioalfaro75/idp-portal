import { prisma } from '../../prisma';
import { NotFoundError, ConflictError, ForbiddenError } from '../../utils/errors';
import type { CreateRoleRequest, UpdateRoleRequest } from '@idp/shared';

export async function listRoles() {
  const roles = await prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
  return roles.map(formatRole);
}

export async function getRole(id: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new NotFoundError('Role');
  return formatRole(role);
}

export async function createRole(data: CreateRoleRequest) {
  const existing = await prisma.role.findUnique({ where: { name: data.name } });
  if (existing) throw new ConflictError('Role name already exists');

  const role = await prisma.role.create({
    data: { name: data.name, permissions: JSON.stringify(data.permissions) },
  });
  return formatRole(role);
}

export async function updateRole(id: string, data: UpdateRoleRequest) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new NotFoundError('Role');
  if (role.isSystem) throw new ForbiddenError('Cannot modify system roles');

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.permissions) updateData.permissions = JSON.stringify(data.permissions);

  const updated = await prisma.role.update({ where: { id }, data: updateData });
  return formatRole(updated);
}

export async function deleteRole(id: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new NotFoundError('Role');
  if (role.isSystem) throw new ForbiddenError('Cannot delete system roles');

  const userCount = await prisma.user.count({ where: { roleId: id } });
  if (userCount > 0) throw new ConflictError('Cannot delete role with assigned users');

  await prisma.role.delete({ where: { id } });
}

function formatRole(role: any) {
  return {
    id: role.id,
    name: role.name,
    permissions: JSON.parse(role.permissions),
    isSystem: role.isSystem,
    createdAt: role.createdAt.toISOString(),
  };
}
