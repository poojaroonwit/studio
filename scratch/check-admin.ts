import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@ncc.com';
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  console.log('User found:', {
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    failedAttempts: (user as any).failedLoginAttempts,
    lockedUntil: (user as any).lockedUntil
  });

  const passwordMatch = await bcrypt.compare('Admin@123', user.password);
  console.log('Password "Admin@123" matches:', passwordMatch);
  
  // Unlock if needed
  if (!user.isActive || passwordMatch === false || (user as any).failedLoginAttempts > 0) {
      console.log('Updating user to ensure it is active and has correct password...');
      await prisma.user.update({
          where: { email },
          data: {
              password: await bcrypt.hash('Admin@123', 10),
              isActive: true,
              failedLoginAttempts: 0,
              lockedUntil: null
          }
      });
      console.log('User updated and unlocked.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
