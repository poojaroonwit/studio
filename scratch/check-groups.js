const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://fitscan:VrTNc55atSS5tWk5cgs5VFdAdxNzZE3T@localhost:5433/fitscan'
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
