const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateSourceWarnings() {
  console.log('🔧 Generating warnings for all candidates without sources...\n');
  
  try {
    // Get the source warning configuration
    const sourceConfig = await prisma.warningConfiguration.findFirst({
      where: { name: 'Candidate No Source' }
    });
    
    if (!sourceConfig) {
      console.log('❌ No "Candidate No Source" configuration found');
      return;
    }
    
    console.log(`📋 Found source warning configuration:`);
    console.log(`   - ID: ${sourceConfig.id}`);
    console.log(`   - Name: ${sourceConfig.name}`);
    console.log(`   - Severity: ${sourceConfig.severity}`);
    console.log(`   - Active: ${sourceConfig.isActive}`);
    
    // Get all candidates without sources
    const candidatesWithoutSource = await prisma.candidate.findMany({
      where: { sourceId: null },
      select: { id: true, name: true, email: true }
    });
    
    console.log(`\n🔍 Found ${candidatesWithoutSource.length} candidates without sources`);
    
    let warningsCreated = 0;
    let warningsSkipped = 0;
    
    for (const candidate of candidatesWithoutSource) {
      // Check if warning already exists
      const existingWarning = await prisma.warning.findFirst({
        where: {
          configuration_id: sourceConfig.id,
          entityType: 'candidate',
          entityId: candidate.id
        }
      });
      
      if (existingWarning) {
        console.log(`   ⏭️  Skipped: ${candidate.name} (warning already exists)`);
        warningsSkipped++;
      } else {
        // Create new warning
        const newWarning = await prisma.warning.create({
          data: {
            configuration_id: sourceConfig.id,
            entityType: 'candidate',
            entityId: candidate.id,
            field: 'sourceId',
            currentValue: 'null',
            expectedValue: 'not null',
            message: `Candidate ${candidate.name} has no source assigned`,
            severity: sourceConfig.severity || 'info',
            updated_at: new Date()
          }
        });
        
        console.log(`   ✅ Created warning for: ${candidate.name} (${newWarning.id})`);
        warningsCreated++;
      }
    }
    
    // Get final count
    const totalWarnings = await prisma.warning.count({
      where: {
        configuration_id: sourceConfig.id
      }
    });
    
    console.log(`\n🎉 Source warning generation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Candidates without sources: ${candidatesWithoutSource.length}`);
    console.log(`   - Warnings created: ${warningsCreated}`);
    console.log(`   - Warnings skipped: ${warningsSkipped}`);
    console.log(`   - Total warnings for this config: ${totalWarnings}`);
    
  } catch (error) {
    console.error('❌ Error generating source warnings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  generateSourceWarnings().catch(console.error);
}

module.exports = { generateSourceWarnings };
