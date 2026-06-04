const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://fitscan:CHANGE_ME_STRONG_PASSWORD@localhost:5433/fitscan'
    }
  }
});

async function main() {
  console.log('Checking for admin@example.com...');
  const user1 = await prisma.user.findUnique({
    where: { email: 'admin@example.com' }
  });
  console.log('admin@example.com:', JSON.stringify(user1, null, 2));

  console.log('\nChecking for all users...');
  const allUsers = await prisma.user.findMany({
    select: { email: true, name: true, role: true }
  });
  console.log('All Users:', JSON.stringify(allUsers, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
