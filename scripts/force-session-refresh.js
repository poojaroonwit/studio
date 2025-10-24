const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function forceSessionRefresh() {
  console.log('🔄 Forcing session refresh for admin user...\n');

  try {
    // Update the admin user's updatedAt timestamp to force session refresh
    const adminUser = await prisma.user.findFirst({
      where: { role: 'Admin' }
    });

    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          updatedAt: new Date()
        }
      });

      console.log('✅ Admin user updated timestamp refreshed');
      console.log('💡 The user should now refresh their browser or log out and log back in to see the updated permissions');
    } else {
      console.log('❌ Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error refreshing session:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceSessionRefresh();
