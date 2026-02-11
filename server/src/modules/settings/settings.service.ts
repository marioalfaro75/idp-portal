import { prisma } from '../../prisma';

export async function get(key: string): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function set(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getAll(): Promise<Record<string, string>> {
  const settings = await prisma.systemSetting.findMany();
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export async function del(key: string): Promise<void> {
  await prisma.systemSetting.deleteMany({ where: { key } });
}
