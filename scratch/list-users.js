const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://hri:CHANGE_ME_STRONG_PASSWORD@localhost:5433/hri'
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      isActive: true
    }
  });

  console.log('Total users:', users.length);
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
