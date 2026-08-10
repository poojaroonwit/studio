import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@outboundcorporation.com' } });
  const position = await prisma.position.findFirst({ where: { title: 'Senior Frontend Developer' } });

  if (admin && position) {
    console.log('Associating admin with position...');
    await prisma.positionInterviewer.upsert({
      where: { positionId_userId: { positionId: position.id, userId: admin.id } },
      update: {},
      create: { positionId: position.id, userId: admin.id }
    });
    console.log('✅ Admin is now an interviewer for Senior Frontend Developer.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
