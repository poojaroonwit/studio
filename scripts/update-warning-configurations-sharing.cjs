const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateWarningConfigurationsSharing() {
  console.log('🔧 Starting warning configuration sharing update...');
  
  try {
    // Get all warning configurations
    const configurations = await prisma.warningConfiguration.findMany({
      select: {
        id: true,
        name: true,
        isPublic: true,
        createdBy: true
      }
    });

    console.log(`📊 Found ${configurations.length} warning configurations`);

    // Update all configurations to be public (shared with anyone)
    const updatePromises = configurations.map(config => 
      prisma.warningConfiguration.update({
        where: { id: config.id },
        data: { 
          isPublic: true 
        }
      })
    );

    await Promise.all(updatePromises);

    console.log('✅ All warning configurations updated to be public (shared with anyone)');

    // Display summary
    const updatedConfigs = await prisma.warningConfiguration.findMany({
      where: { isPublic: true },
             select: {
         id: true,
         name: true,
         severity: true,
         entityType: true,
         isActive: true
       },
      orderBy: { name: 'asc' }
    });

    console.log('\n📋 Updated Warning Configurations:');
    console.log('=====================================');
    
         updatedConfigs.forEach(config => {
       const status = config.isActive ? '🟢 Active' : '🔴 Inactive';
       const severity = config.severity ? `[${config.severity.toUpperCase()}]` : '[WARNING]';
       console.log(`${status} ${severity} ${config.name} (${config.entityType})`);
     });

    console.log(`\n✅ Successfully updated ${updatedConfigs.length} warning configurations to be public`);
    console.log('🌐 All configurations are now shared with anyone in the system');

  } catch (error) {
    console.error('❌ Error updating warning configurations:', error);
    throw error;
  }
}

async function main() {
  try {
    await updateWarningConfigurationsSharing();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { updateWarningConfigurationsSharing };
