import { PrismaClient } from '@prisma/client';
import { SYSTEM_ROLES } from '@idp/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  for (const [key, role] of Object.entries(SYSTEM_ROLES)) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        permissions: JSON.stringify(role.permissions),
      },
      create: {
        name: role.name,
        permissions: JSON.stringify(role.permissions),
        isSystem: true,
      },
    });
    console.log(`  Upserted role: ${role.name}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
