const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWarningConfigurations() {
  console.log('🔍 Checking warning configurations...\n');

  try {
    const configs = await prisma.warningConfiguration.findMany({
      include: {
        createdByUser: {
          select: { name: true }
        }
      }
    });

    console.log(`📊 Found ${configs.length} warning configurations:\n`);

    if (configs.length === 0) {
      console.log('❌ No warning configurations found in database');
      console.log('💡 You may need to run the seeding script or create configurations manually');
      return;
    }

    configs.forEach((config, index) => {
      console.log(`${index + 1}. ${config.name}`);
      console.log(`   - Entity: ${config.entityType || 'null'}.${config.field || 'null'}`);
      console.log(`   - Condition: ${config.condition || 'null'} ${config.operator || 'null'} ${config.value || 'null'}`);
      console.log(`   - Severity: ${config.severity}`);
      console.log(`   - Status: ${config.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   - Public: ${config.isPublic ? 'Yes' : 'No'}`);
      console.log(`   - Created by: ${config.createdByUser.name}`);
      console.log(`   - ID: ${config.id}`);
      
      // Check for new format data
      if (config.conditionGroups && config.conditionGroups.length > 0) {
        console.log(`   - Condition Groups: ${config.conditionGroups.length} group(s)`);
        config.conditionGroups.forEach((group, groupIndex) => {
          console.log(`     Group ${groupIndex + 1}: ${group.logicalOperator || 'AND'} (${group.conditions?.length || 0} conditions)`);
          if (group.conditions) {
            group.conditions.forEach((condition, condIndex) => {
              console.log(`       Condition ${condIndex + 1}: ${condition.entityType}.${condition.field} ${condition.condition} ${condition.value || 'null'}`);
            });
          }
        });
      } else if (config.crossEntityConditions && config.crossEntityConditions.length > 0) {
        console.log(`   - Cross Entity Conditions: ${config.crossEntityConditions.length} condition(s)`);
        config.crossEntityConditions.forEach((condition, condIndex) => {
          console.log(`     Condition ${condIndex + 1}: ${condition.entityType}.${condition.field} ${condition.condition} ${condition.value || 'null'}`);
        });
      } else if (config.conditions && config.conditions.length > 0) {
        console.log(`   - Conditions: ${config.conditions.length} condition(s)`);
        config.conditions.forEach((condition, condIndex) => {
          console.log(`     Condition ${condIndex + 1}: ${condition.field} ${condition.condition} ${condition.value || 'null'}`);
        });
      } else {
        console.log(`   - ⚠️ No condition data found (legacy fields are null)`);
      }
      console.log('');
    });

    // Check active configurations
    const activeConfigs = configs.filter(c => c.isActive);
    console.log(`✅ Active configurations: ${activeConfigs.length}/${configs.length}`);

    // Check public configurations
    const publicConfigs = configs.filter(c => c.isPublic);
    console.log(`🌐 Public configurations: ${publicConfigs.length}/${configs.length}`);

    // Check configurations with valid condition data
    const validConfigs = configs.filter(c => 
      (c.conditionGroups && c.conditionGroups.length > 0) ||
      (c.crossEntityConditions && c.crossEntityConditions.length > 0) ||
      (c.conditions && c.conditions.length > 0) ||
      (c.entityType && c.field && c.condition)
    );
    console.log(`🔧 Configurations with valid condition data: ${validConfigs.length}/${configs.length}`);

  } catch (error) {
    console.error('❌ Error checking warning configurations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWarningConfigurations();
