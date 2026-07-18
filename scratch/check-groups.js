const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://hri:CHANGE_ME_STRONG_PASSWORD@localhost:5433/hri'
    }
  }
});

async function main() {
  const groups = await prisma.userGroup.findMany({
    select: { id: true, name: true }
  });
  console.log(JSON.stringify(groups, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
