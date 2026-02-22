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
 * Templates with no group assignments are visible to everyone.
 * Templates with group assignments are only visible to members of those groups.
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

  return {
    OR: [
      { groupAssignments: { none: {} } },
      ...(accessibleTemplateIds.length > 0 ? [{ id: { in: accessibleTemplateIds } }] : []),
    ],
  };
}

/**
 * Check if a user has access to a specific template.
 * Returns true if the template has no group assignments, or if the user is in a group that has the template.
 */
export async function checkTemplateAccess(templateId: string, userId: string): Promise<boolean> {
  const assignmentCount = await prisma.groupTemplate.count({ where: { templateId } });
  if (assignmentCount === 0) return true;

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
