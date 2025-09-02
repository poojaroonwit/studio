const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('Creating admin user...');
  
  try {
    const adminEmail = 'admin@qsncc.com';
    const adminPassword = 'nccadmin'; // Plain text password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      // Update existing user's password
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          forcePasswordChange: false
        }
      });
      console.log('✅ Admin user password updated');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    } else {
      // Create new admin user
      await prisma.user.create({
        data: {
          name: 'Admin User',
          email: adminEmail,
          password: hashedPassword,
          role: 'Admin',
          authenticationMethod: 'basic',
          forcePasswordChange: false
        }
      });
      console.log('✅ Admin user created');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    }

    // Check if user groups exist and assign admin to Admin group
    const adminGroup = await prisma.userGroup.findUnique({
      where: { id: '00000000-0000-0000-0000-000000000001' }
    });

    if (adminGroup) {
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail }
      });

      if (adminUser) {
        // Check if user is already in the admin group
        if (!adminUser.userGroupId) {
          await prisma.user.update({
            where: { id: adminUser.id },
            data: { userGroupId: '00000000-0000-0000-0000-000000000001' }
          });
          console.log('✅ Admin user assigned to Admin group');
        } else {
          console.log('ℹ️ Admin user already in Admin group');
        }
      }
    } else {
      console.log('⚠️ Admin user group not found - user created without group assignment');
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser()
  .then(() => {
    console.log('🎉 Admin user setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  });
