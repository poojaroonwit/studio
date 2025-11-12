const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAdminPermissions() {
  console.log('🔧 Fixing admin user permissions...\n');

  try {
    // Get the admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'Admin' },
      include: { userGroup: true }
    });

    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }

    console.log(`👤 Found admin user: ${adminUser.name} (${adminUser.email})`);
    console.log(`📋 Current permissions: ${adminUser.module_permissions.join(', ') || 'None'}`);

    // Get all permissions from the admin user group
    if (adminUser.userGroup) {
      const allPermissions = adminUser.userGroup.permissions;
      console.log(`📋 Group permissions: ${allPermissions.join(', ')}`);

      // Update the user's module_permissions
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          module_permissions: allPermissions
        }
      });

      console.log('Updated admin user permissions');
      console.log(`📋 New permissions: ${allPermissions.join(', ')}`);
      console.log(`🔍 Has SYSTEM_SETTINGS_VIEW: ${allPermissions.includes('SYSTEM_SETTINGS_VIEW')}`);
    } else {
      console.log('Admin user has no group assigned');
    }

  } catch (error) {
    console.error('Error fixing permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPermissions();
