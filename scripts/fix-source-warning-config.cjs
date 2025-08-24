const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSourceWarningConfig() {
  console.log('🔧 Fixing Source Warning Configuration...\n');
  
  try {
    // Find warning configurations that use the wrong field name for source
    const sourceConfigs = await prisma.warningConfiguration.findMany({
      where: {
        OR: [
          { name: { contains: 'Source', mode: 'insensitive' } },
          { field: 'source' },
          { field: 'sourceId' }
        ]
      }
    });
    
    console.log(`Found ${sourceConfigs.length} source-related warning configurations:`);
    
    for (const config of sourceConfigs) {
      console.log(`\n📋 Configuration: ${config.name}`);
      console.log(`   - Current field: ${config.field}`);
      console.log(`   - Current condition: ${config.condition}`);
      console.log(`   - Has condition groups: ${config.conditionGroups ? 'Yes' : 'No'}`);
      
      // Check if this is a simple configuration that needs fixing
      if (config.field === 'source') {
        console.log(`   🔧 Fixing field from 'source' to 'sourceId'`);
        
        await prisma.warningConfiguration.update({
          where: { id: config.id },
          data: { field: 'sourceId' }
        });
        
        console.log(`   ✅ Fixed field name`);
      }
      
      // Check condition groups for source field issues
      if (config.conditionGroups && Array.isArray(config.conditionGroups)) {
        let needsUpdate = false;
        const updatedGroups = config.conditionGroups.map(group => {
          if (group.conditions && Array.isArray(group.conditions)) {
            const updatedConditions = group.conditions.map(condition => {
              if (condition.field === 'source') {
                console.log(`   🔧 Fixing condition group field from 'source' to 'sourceId'`);
                needsUpdate = true;
                return { ...condition, field: 'sourceId' };
              }
              return condition;
            });
            return { ...group, conditions: updatedConditions };
          }
          return group;
        });
        
        if (needsUpdate) {
          await prisma.warningConfiguration.update({
            where: { id: config.id },
            data: { conditionGroups: updatedGroups }
          });
          console.log(`   ✅ Fixed condition groups`);
        }
      }
    }
    
    // Now let's check if there are any candidates without sources
    console.log('\n🔍 Checking for candidates without sources...');
    const candidatesWithoutSource = await prisma.candidate.findMany({
      where: { sourceId: null },
      select: { id: true, name: true, email: true }
    });
    
    console.log(`Found ${candidatesWithoutSource.length} candidates without source:`);
    candidatesWithoutSource.forEach(candidate => {
      console.log(`   - ${candidate.name} (${candidate.email})`);
    });
    
    if (candidatesWithoutSource.length > 0) {
      console.log('\n💡 These candidates should trigger warnings if the configuration is correct.');
      console.log('Try clicking the refresh button in the warning drawer to see if warnings appear.');
    } else {
      console.log('\n✅ All candidates have sources assigned - no warnings should appear.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing source warning configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixSourceWarningConfig().catch(console.error);
}

module.exports = { fixSourceWarningConfig };
