const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWarningStatus() {
  console.log('🔍 Checking Warning System Status...\n');
  
  try {
    // 1. Check warning configurations
    console.log('📋 Warning Configurations:');
    const configurations = await prisma.warningConfiguration.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        entityType: true,
        field: true,
        condition: true,
        severity: true,
        isPublic: true,
        conditionGroups: true
      }
    });
    
    console.log(`Found ${configurations.length} active warning configurations:`);
    configurations.forEach((config, index) => {
      console.log(`  ${index + 1}. ${config.name}`);
      console.log(`     - Entity: ${config.entityType || 'null'}.${config.field || 'null'}`);
      console.log(`     - Condition: ${config.condition || 'null'}`);
      console.log(`     - Severity: ${config.severity}`);
      console.log(`     - Public: ${config.isPublic ? 'Yes' : 'No'}`);
      console.log(`     - Has Condition Groups: ${config.conditionGroups ? 'Yes' : 'No'}`);
    });

    // 2. Check current warnings
    console.log('\n⚠️ Current Warnings:');
    const warnings = await prisma.warning.findMany({
      include: {
        configuration: {
          select: { name: true }
        }
      }
    });
    
    console.log(`Found ${warnings.length} warnings in database:`);
    warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning.configuration.name}: ${warning.message}`);
      console.log(`     - Entity: ${warning.entityType}:${warning.entityId}`);
      console.log(`     - Severity: ${warning.severity}`);
    });

    // 3. Check entities that might have issues
    console.log('\n🏢 Checking Entities for Potential Issues:');
    
    // Check candidates without recruiters
    const candidatesWithoutRecruiter = await prisma.candidate.findMany({
      where: { recruiterId: null },
      select: { id: true, name: true, email: true }
    });
    console.log(`Candidates without recruiter: ${candidatesWithoutRecruiter.length}`);
    
    // Check positions without recruiters
    const positionsWithoutRecruiter = await prisma.position.findMany({
      where: { recruiterId: null },
      select: { id: true, title: true }
    });
    console.log(`Positions without recruiter: ${positionsWithoutRecruiter.length}`);
    
    // Check candidates without source
    const candidatesWithoutSource = await prisma.candidate.findMany({
      where: { sourceId: null },
      select: { id: true, name: true, email: true }
    });
    console.log(`Candidates without source: ${candidatesWithoutSource.length}`);

    // 4. Summary
    console.log('\n📊 Summary:');
    console.log(`  - Active configurations: ${configurations.length}`);
    console.log(`  - Current warnings: ${warnings.length}`);
    console.log(`  - Candidates without recruiter: ${candidatesWithoutRecruiter.length}`);
    console.log(`  - Positions without recruiter: ${positionsWithoutRecruiter.length}`);
    console.log(`  - Candidates without source: ${candidatesWithoutSource.length}`);

    if (warnings.length === 0 && configurations.length > 0) {
      console.log('\n💡 No warnings found despite having configurations. This could mean:');
      console.log('   1. All issues have been resolved');
      console.log('   2. The warning conditions are not being met');
      console.log('   3. There might be an issue with the warning evaluation logic');
    }

    if (configurations.length === 0) {
      console.log('\n❌ No active warning configurations found!');
      console.log('💡 You need to create warning configurations in Settings > Warning Configurations');
    }

  } catch (error) {
    console.error('❌ Error checking warning status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  checkWarningStatus().catch(console.error);
}

module.exports = { checkWarningStatus };
