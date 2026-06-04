const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://fitscan:CHANGE_ME_STRONG_PASSWORD@localhost:5433/fitscan'
    }
  }
});

async function main() {
  const adminEmail = 'admin@ncc.com';
  const adminPassword = 'nccadmin';
  const adminGroupId = 'c859c3e4-dbac-45b0-b3a0-7f7196df3258';

  console.log(`Creating/Resetting admin user: ${adminEmail}...`);

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'Admin',
      userGroupId: adminGroupId,
      isActive: true,
      forcePasswordChange: false
    },
    create: {
      name: 'Admin User',
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin',
      userGroupId: adminGroupId,
      isActive: true,
      authenticationMethods: ['basic'],
      forcePasswordChange: false
    }
  });

  console.log('✅ Success! Admin user is ready.');
  console.log('Email:', user.email);
  console.log('Password:', adminPassword);
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
