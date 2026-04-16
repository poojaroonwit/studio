const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('--- User Fix Script Start ---');
  
  const adminPassword = 'nccadmin';
  const demoPassword = 'Demo@Seed#2024!';
  
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const demoHash = await bcrypt.hash(demoPassword, 10);

  // 1. Find the Admin Group
  const adminGroup = await prisma.userGroup.findFirst({
    where: { name: 'Admin' }
  });

  if (!adminGroup) {
    console.error('❌ Admin group not found. Please run the main seed script first.');
    return;
  }

  console.log(`Found Admin Group ID: ${adminGroup.id}`);

  // 2. Fix admin@ncc.com
  console.log('Fixing admin@ncc.com...');
  await prisma.user.upsert({
    where: { email: 'admin@ncc.com' },
    update: {
      password: adminHash,
      isActive: true,
      role: 'Admin',
      userGroupId: adminGroup.id,
      failedLoginAttempts: 0,
      authenticationMethods: ['basic']
    },
    create: {
      name: 'NCC Admin',
      email: 'admin@ncc.com',
      password: adminHash,
      isActive: true,
      role: 'Admin',
      userGroupId: adminGroup.id,
      authenticationMethods: ['basic']
    }
  });
  console.log('✅ admin@ncc.com fixed');

  // 3. Fix fitscan@qsncc.com
  console.log('Fixing fitscan@qsncc.com...');
  await prisma.user.upsert({
    where: { email: 'fitscan@qsncc.com' },
    update: {
      password: demoHash,
      isActive: true,
      role: 'Admin',
      userGroupId: adminGroup.id,
      failedLoginAttempts: 0,
      authenticationMethods: ['basic']
    },
    create: {
      name: 'FitScan Demo Admin',
      email: 'fitscan@qsncc.com',
      password: demoHash,
      isActive: true,
      role: 'Admin',
      userGroupId: adminGroup.id,
      authenticationMethods: ['basic']
    }
  });
  console.log('✅ fitscan@qsncc.com fixed');

  console.log('--- User Fix Script End ---');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
