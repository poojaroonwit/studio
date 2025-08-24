const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addWarningConfigurationsPermission() {
  console.log('🔧 Starting warning configurations permission update...');
  
  try {
    // Get all admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'Admin'
      },
      select: {
        id: true,
        name: true,
        email: true,
        modulePermissions: true
      }
    });

    console.log(`📊 Found ${adminUsers.length} admin users`);

    // Update admin users to include the new permission
    const updatePromises = adminUsers.map(user => {
      const currentPermissions = user.modulePermissions || [];
      const newPermissions = currentPermissions.includes('WARNING_CONFIGURATIONS_MANAGE') 
        ? currentPermissions 
        : [...currentPermissions, 'WARNING_CONFIGURATIONS_MANAGE'];
      
      return prisma.user.update({
        where: { id: user.id },
        data: { 
          modulePermissions: newPermissions
        }
      });
    });

    await Promise.all(updatePromises);

    console.log('✅ All admin users updated with WARNING_CONFIGURATIONS_MANAGE permission');

    // Display summary
    const updatedUsers = await prisma.user.findMany({
      where: {
        role: 'Admin'
      },
      select: {
        id: true,
        name: true,
        email: true,
        modulePermissions: true
      }
    });

    console.log('\n📋 Updated Admin Users:');
    console.log('========================');
    
    updatedUsers.forEach(user => {
      const hasPermission = user.modulePermissions?.includes('WARNING_CONFIGURATIONS_MANAGE') ? '✅' : '❌';
      console.log(`${hasPermission} ${user.name} (${user.email})`);
    });

    console.log(`\n✅ Successfully updated ${updatedUsers.length} admin users`);
    console.log('🔐 All admin users now have WARNING_CONFIGURATIONS_MANAGE permission');

  } catch (error) {
    console.error('❌ Error updating admin users:', error);
    throw error;
  }
}

async function main() {
  try {
    await addWarningConfigurationsPermission();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
