import { prisma } from '../../prisma';
import { NotFoundError, ConflictError } from '../../utils/errors';

export async function listGroups() {
  return prisma.group.findMany({
    include: { _count: { select: { members: true, templates: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getGroup(id: string) {
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, email: true, displayName: true } } } },
      templates: { include: { template: { select: { id: true, name: true, provider: true, category: true } } } },
    },
  });
  if (!group) throw new NotFoundError('Group');
  return group;
}

export async function createGroup(data: { name: string; description?: string }) {
  const existing = await prisma.group.findUnique({ where: { name: data.name } });
  if (existing) throw new ConflictError('A group with this name already exists');

  return prisma.group.create({
    data: { name: data.name, description: data.description || '' },
    include: { _count: { select: { members: true, templates: true } } },
  });
}

export async function updateGroup(id: string, data: { name?: string; description?: string }) {
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw new NotFoundError('Group');

  if (data.name && data.name !== group.name) {
    const existing = await prisma.group.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError('A group with this name already exists');
  }

  return prisma.group.update({
    where: { id },
    data,
    include: { _count: { select: { members: true, templates: true } } },
  });
}

export async function deleteGroup(id: string) {
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw new NotFoundError('Group');
  await prisma.group.delete({ where: { id } });
}

export async function setMembers(groupId: string, userIds: string[]) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundError('Group');

  await prisma.$transaction([
    prisma.groupMember.deleteMany({ where: { groupId } }),
    ...(userIds.length > 0
      ? [prisma.groupMember.createMany({ data: userIds.map((userId) => ({ groupId, userId })) })]
      : []),
  ]);

  return getGroup(groupId);
}

export async function setTemplates(groupId: string, templateIds: string[]) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundError('Group');

  await prisma.$transaction([
    prisma.groupTemplate.deleteMany({ where: { groupId } }),
    ...(templateIds.length > 0
      ? [prisma.groupTemplate.createMany({ data: templateIds.map((templateId) => ({ groupId, templateId })) })]
      : []),
  ]);

  return getGroup(groupId);
}

/**
 * Returns a Prisma `where` clause fragment for filtering templates by group access.
 * Non-admin users can only see templates assigned to groups they belong to.
 */
export async function getTemplateAccessFilter(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });

  const groupIds = memberships.map((m) => m.groupId);

  // Get template IDs accessible through the user's groups
  const accessibleTemplates = groupIds.length > 0
    ? await prisma.groupTemplate.findMany({
        where: { groupId: { in: groupIds } },
        select: { templateId: true },
      })
    : [];

  const accessibleTemplateIds = [...new Set(accessibleTemplates.map((t) => t.templateId))];

  return accessibleTemplateIds.length > 0
    ? { id: { in: accessibleTemplateIds } }
    : { id: { in: [] } };
}

/**
 * Check if a user has access to a specific template.
 * Returns true only if the user is in a group that has the template assigned.
 */
export async function checkTemplateAccess(templateId: string, userId: string): Promise<boolean> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });

  if (memberships.length === 0) return false;

  const match = await prisma.groupTemplate.findFirst({
    where: {
      templateId,
      groupId: { in: memberships.map((m) => m.groupId) },
    },
  });

  return !!match;
}
