const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://hri:CHANGE_ME_STRONG_PASSWORD@localhost:5433/hri'
    }
  }
});

async function main() {
  const adminEmails = ['admin@outboundcorporation.com', 'hri@qsoutboundcorporation.com', 'admin@example.com'];
  const password = 'Admin@123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('Unlocking and resetting passwords for admin accounts...');

  for (const email of adminEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      });
      console.log(`✅ Unlocked and reset password for: ${email}`);
    } else {
      console.log(`ℹ️ User not found: ${email}`);
    }
  }

  console.log('\nYou should now be able to login with:');
  console.log(`Email: admin@outboundcorporation.com`);
  console.log(`Password: ${password}`);
}

main()
  .catch(e => console.error('❌ Error:', e))
  .finally(async () => await prisma.$disconnect());
