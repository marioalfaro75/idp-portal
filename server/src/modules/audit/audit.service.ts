import { prisma } from '../../prisma';
import { logger } from '../../utils/logger';

interface AuditEntry {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  userId?: string;
  ipAddress?: string;
}

export async function log(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        userId: entry.userId || null,
        ipAddress: entry.ipAddress || null,
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log', { error: (err as Error).message });
  }
}

export async function list(query: { action?: string; resource?: string; userId?: string; page?: number; limit?: number }) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 100);
  const where: Record<string, unknown> = {};
  if (query.action) where.action = query.action;
  if (query.resource) where.resource = query.resource;
  if (query.userId) where.userId = query.userId;

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, displayName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: entries.map((e) => ({
      id: e.id,
      action: e.action,
      resource: e.resource,
      resourceId: e.resourceId,
      details: e.details ? JSON.parse(e.details) : null,
      userId: e.userId,
      user: e.user,
      ipAddress: e.ipAddress,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}
