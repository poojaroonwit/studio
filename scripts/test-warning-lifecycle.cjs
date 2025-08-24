const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWarningLifecycle() {
  console.log('🧪 Testing Warning Lifecycle...\n');
  
  try {
    // Get current warning count
    const sourceConfig = await prisma.warningConfiguration.findFirst({
      where: { name: 'Candidate No Source' }
    });
    
    const initialWarningCount = await prisma.warning.count({
      where: { configuration_id: sourceConfig.id }
    });
    
    console.log(`📊 Initial warning count: ${initialWarningCount}`);
    
    // Get a candidate without source
    const candidateWithoutSource = await prisma.candidate.findFirst({
      where: { sourceId: null },
      select: { id: true, name: true, email: true, sourceId: true }
    });
    
    if (!candidateWithoutSource) {
      console.log('❌ No candidates without source found');
      return;
    }
    
    console.log(`\n🔍 Testing with candidate: ${candidateWithoutSource.name}`);
    console.log(`   - Current sourceId: ${candidateWithoutSource.sourceId}`);
    
    // Check if warning exists
    const existingWarning = await prisma.warning.findFirst({
      where: {
        configuration_id: sourceConfig.id,
        entityType: 'candidate',
        entityId: candidateWithoutSource.id
      }
    });
    
    if (existingWarning) {
      console.log(`   ✅ Warning exists: ${existingWarning.id}`);
      console.log(`   - Message: ${existingWarning.message}`);
      
      // Simulate assigning a source (you would do this in the UI)
      console.log(`\n🔧 Simulating source assignment...`);
      
      // Get a source to assign
      const availableSource = await prisma.candidateSource.findFirst({
        select: { id: true, name: true }
      });
      
      if (availableSource) {
        console.log(`   - Assigning source: ${availableSource.name}`);
        
        // Update candidate with source
        await prisma.candidate.update({
          where: { id: candidateWithoutSource.id },
          data: { sourceId: availableSource.id }
        });
        
        console.log(`   ✅ Source assigned successfully`);
        
        // Check if warning is automatically cleared
        const warningAfterUpdate = await prisma.warning.findFirst({
          where: {
            configuration_id: sourceConfig.id,
            entityType: 'candidate',
            entityId: candidateWithoutSource.id
          }
        });
        
        if (warningAfterUpdate) {
          console.log(`   ⚠️  Warning still exists (needs manual clearing)`);
        } else {
          console.log(`   ✅ Warning automatically cleared!`);
        }
        
        // Get updated warning count
        const finalWarningCount = await prisma.warning.count({
          where: { configuration_id: sourceConfig.id }
        });
        
        console.log(`\n📊 Final warning count: ${finalWarningCount}`);
        console.log(`📉 Warning count change: ${initialWarningCount - finalWarningCount}`);
        
        // Clean up - remove the source assignment for testing
        console.log(`\n🧹 Cleaning up test data...`);
        await prisma.candidate.update({
          where: { id: candidateWithoutSource.id },
          data: { sourceId: null }
        });
        console.log(`   ✅ Reverted source assignment`);
        
      } else {
        console.log(`   ❌ No sources available to assign`);
      }
      
    } else {
      console.log(`   ❌ No warning found for this candidate`);
    }
    
  } catch (error) {
    console.error('❌ Error testing warning lifecycle:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  testWarningLifecycle().catch(console.error);
}

module.exports = { testWarningLifecycle };
