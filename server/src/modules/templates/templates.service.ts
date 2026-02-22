import { prisma } from '../../prisma';
import { NotFoundError } from '../../utils/errors';
import { scanTemplates } from './template-parser';
import * as groupsService from '../groups/groups.service';

interface UserContext {
  sub: string;
  role: string;
}

export async function list(query?: { provider?: string; category?: string; search?: string }, user?: UserContext) {
  const where: Record<string, unknown> = {};
  if (query?.provider) where.provider = query.provider;
  if (query?.category) where.category = query.category;
  if (query?.search) {
    where.OR = [
      { name: { contains: query.search } },
      { description: { contains: query.search } },
    ];
  }

  if (user && user.role !== 'Admin') {
    const accessFilter = await groupsService.getTemplateAccessFilter(user.sub);
    where.AND = [accessFilter];
  }

  const templates = await prisma.template.findMany({ where, orderBy: { name: 'asc' } });
  return templates.map(formatTemplate);
}

export async function get(id: string, user?: UserContext) {
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) throw new NotFoundError('Template');

  if (user && user.role !== 'Admin') {
    const hasAccess = await groupsService.checkTemplateAccess(id, user.sub);
    if (!hasAccess) throw new NotFoundError('Template');
  }

  return formatTemplate(template);
}

export async function getBySlug(slug: string, user?: UserContext) {
  const template = await prisma.template.findUnique({ where: { slug } });
  if (!template) throw new NotFoundError('Template');

  if (user && user.role !== 'Admin') {
    const hasAccess = await groupsService.checkTemplateAccess(template.id, user.sub);
    if (!hasAccess) throw new NotFoundError('Template');
  }

  return formatTemplate(template);
}

export async function sync(): Promise<number> {
  const parsed = scanTemplates();

  for (const t of parsed) {
    await prisma.template.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        name: t.metadata.name,
        description: t.metadata.description,
        provider: t.metadata.provider,
        category: t.metadata.category,
        version: t.metadata.version,
        templatePath: t.templatePath,
        variables: JSON.stringify(t.variables),
        outputs: JSON.stringify(t.outputs),
        tags: JSON.stringify(t.metadata.tags),
        workflow: t.workflow,
        hasScaffold: t.hasScaffold,
      },
      update: {
        name: t.metadata.name,
        description: t.metadata.description,
        provider: t.metadata.provider,
        category: t.metadata.category,
        version: t.metadata.version,
        templatePath: t.templatePath,
        variables: JSON.stringify(t.variables),
        outputs: JSON.stringify(t.outputs),
        tags: JSON.stringify(t.metadata.tags),
        workflow: t.workflow,
        hasScaffold: t.hasScaffold,
      },
    });
  }

  return parsed.length;
}

function formatTemplate(t: any) {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    provider: t.provider,
    category: t.category,
    version: t.version,
    templatePath: t.templatePath,
    variables: JSON.parse(t.variables),
    outputs: JSON.parse(t.outputs),
    tags: JSON.parse(t.tags),
    workflow: t.workflow || null,
    hasScaffold: t.hasScaffold || false,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
