const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function triggerWarningChecks() {
  console.log('🔧 Triggering Warning Checks for Existing Data...\n');
  
  try {
    // 1. Get all active warning configurations
    const configurations = await prisma.warningConfiguration.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        entityType: true
      }
    });
    
    console.log(`Found ${configurations.length} active warning configurations`);
    
    // 2. Get all positions and trigger warning checks
    console.log('\n🏢 Checking positions...');
    const positions = await prisma.position.findMany({
      select: { id: true, title: true }
    });
    
    console.log(`Found ${positions.length} positions to check`);
    let positionWarningsCreated = 0;
    
    for (const position of positions) {
      try {
        // Import the WarningServiceHelper
        const { WarningServiceHelper } = require('./warning-service-helper.cjs');
        
        // Check warnings for this position
        const results = await WarningServiceHelper.checkEntityWarnings('position', position.id);
        
        if (results.length > 0) {
          console.log(`  ✅ ${position.title}: ${results.length} warnings detected`);
          positionWarningsCreated += results.length;
          
          // Create or update warnings
          await WarningServiceHelper.createOrUpdateWarnings('position', position.id);
        } else {
          console.log(`  ⭕ ${position.title}: No warnings`);
        }
      } catch (error) {
        console.error(`  ❌ Error checking position ${position.title}:`, error.message);
      }
    }
    
    // 3. Get all candidates and trigger warning checks
    console.log('\n👤 Checking candidates...');
    const candidates = await prisma.candidate.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`Found ${candidates.length} candidates to check`);
    let candidateWarningsCreated = 0;
    
    for (const candidate of candidates) {
      try {
        // Import the WarningServiceHelper
        const { WarningServiceHelper } = require('./warning-service-helper.cjs');
        
        // Check warnings for this candidate
        const results = await WarningServiceHelper.checkEntityWarnings('candidate', candidate.id);
        
        if (results.length > 0) {
          console.log(`  ✅ ${candidate.name}: ${results.length} warnings detected`);
          candidateWarningsCreated += results.length;
          
          // Create or update warnings
          await WarningServiceHelper.createOrUpdateWarnings('candidate', candidate.id);
        } else {
          console.log(`  ⭕ ${candidate.name}: No warnings`);
        }
      } catch (error) {
        console.error(`  ❌ Error checking candidate ${candidate.name}:`, error.message);
      }
    }
    
    // 4. Get all headcounts and trigger warning checks
    console.log('\n📊 Checking headcounts...');
    const headcounts = await prisma.headcount.findMany({
      select: { id: true, type: true }
    });
    
    console.log(`Found ${headcounts.length} headcounts to check`);
    let headcountWarningsCreated = 0;
    
    for (const headcount of headcounts) {
      try {
        // Import the WarningServiceHelper
        const { WarningServiceHelper } = require('./warning-service-helper.cjs');
        
        // Check warnings for this headcount
        const results = await WarningServiceHelper.checkEntityWarnings('headcount', headcount.id);
        
        if (results.length > 0) {
          console.log(`  ✅ Headcount ${headcount.id} (${headcount.type}): ${results.length} warnings detected`);
          headcountWarningsCreated += results.length;
          
          // Create or update warnings
          await WarningServiceHelper.createOrUpdateWarnings('headcount', headcount.id);
        } else {
          console.log(`  ⭕ Headcount ${headcount.id} (${headcount.type}): No warnings`);
        }
      } catch (error) {
        console.error(`  ❌ Error checking headcount ${headcount.id}:`, error.message);
      }
    }
    
    // 5. Summary
    console.log('\n📊 Summary:');
    console.log(`  - Active configurations: ${configurations.length}`);
    console.log(`  - Positions checked: ${positions.length}`);
    console.log(`  - Candidates checked: ${candidates.length}`);
    console.log(`  - Headcounts checked: ${headcounts.length}`);
    console.log(`  - Position warnings created: ${positionWarningsCreated}`);
    console.log(`  - Candidate warnings created: ${candidateWarningsCreated}`);
    console.log(`  - Headcount warnings created: ${headcountWarningsCreated}`);
    console.log(`  - Total warnings created: ${positionWarningsCreated + candidateWarningsCreated + headcountWarningsCreated}`);
    
    // 6. Show final warning count
    const totalWarnings = await prisma.warning.count();
    console.log(`\n📈 Total warnings in database: ${totalWarnings}`);
    
    if (totalWarnings > 0) {
      console.log('\n✅ Warning system is working! Warnings have been created for data that meets the conditions.');
    } else {
      console.log('\n⚠️  No warnings were created. This might indicate:');
      console.log('   1. No data meets the warning conditions');
      console.log('   2. Warning configurations are not properly set up');
      console.log('   3. There was an error in the warning check process');
    }
    
  } catch (error) {
    console.error('❌ Error triggering warning checks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
triggerWarningChecks().catch(console.error);
