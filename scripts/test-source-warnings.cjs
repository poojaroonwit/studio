const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSourceWarnings() {
  console.log('🔍 Testing Source Warnings...\n');
  
  try {
    // Get candidates without sources
    const candidatesWithoutSource = await prisma.candidate.findMany({
      where: { sourceId: null },
      select: { id: true, name: true, email: true },
      take: 5 // Test with first 5 candidates
    });
    
    console.log(`Found ${candidatesWithoutSource.length} candidates without source to test:`);
    candidatesWithoutSource.forEach(candidate => {
      console.log(`   - ${candidate.name} (${candidate.email}) - ID: ${candidate.id}`);
    });
    
    // Get the source warning configuration
    const sourceConfig = await prisma.warningConfiguration.findFirst({
      where: { name: 'Candidate No Source' }
    });
    
    if (!sourceConfig) {
      console.log('❌ No "Candidate No Source" configuration found');
      return;
    }
    
    console.log(`\n📋 Found source warning configuration:`);
    console.log(`   - ID: ${sourceConfig.id}`);
    console.log(`   - Name: ${sourceConfig.name}`);
    console.log(`   - Severity: ${sourceConfig.severity}`);
    console.log(`   - Active: ${sourceConfig.isActive}`);
    console.log(`   - Condition Groups: ${JSON.stringify(sourceConfig.conditionGroups, null, 2)}`);
    
    // Test each candidate
    for (const candidate of candidatesWithoutSource) {
      console.log(`\n🔍 Testing candidate: ${candidate.name}`);
      
      // Get full candidate data
      const fullCandidate = await prisma.candidate.findUnique({
        where: { id: candidate.id },
        include: { 
          position: {
            include: {
              grade: true
            }
          }
        }
      });
      
      console.log(`   - sourceId: ${fullCandidate.sourceId}`);
      console.log(`   - source relation: ${fullCandidate.source ? 'exists' : 'null'}`);
      
      // Manually evaluate the condition
      const conditionGroups = sourceConfig.conditionGroups;
      if (conditionGroups && Array.isArray(conditionGroups) && conditionGroups.length > 0) {
        const firstGroup = conditionGroups[0];
        if (firstGroup.conditions && Array.isArray(firstGroup.conditions) && firstGroup.conditions.length > 0) {
          const condition = firstGroup.conditions[0];
          console.log(`   - Condition: ${condition.entityType}.${condition.field} ${condition.condition} ${condition.value}`);
          
          // Check if condition should trigger
          const fieldValue = fullCandidate[condition.field];
          console.log(`   - Field value: ${fieldValue}`);
          
          const shouldTrigger = fieldValue === null || fieldValue === undefined || fieldValue === '';
          console.log(`   - Should trigger warning: ${shouldTrigger}`);
          
          if (shouldTrigger) {
            // Check if warning already exists
            const existingWarning = await prisma.warning.findFirst({
              where: {
                configuration_id: sourceConfig.id,
                entityType: 'candidate',
                entityId: candidate.id
              }
            });
            
            if (existingWarning) {
              console.log(`   ✅ Warning already exists: ${existingWarning.id}`);
            } else {
              console.log(`   ❌ No warning found - should create one`);
              
              // Create the warning manually
              const newWarning = await prisma.warning.create({
                data: {
                  configuration_id: sourceConfig.id,
                  entityType: 'candidate',
                  entityId: candidate.id,
                  field: condition.field,
                  currentValue: fieldValue?.toString() || 'null',
                  expectedValue: condition.value?.toString() || 'not null',
                  message: `Candidate ${candidate.name} has no source assigned`,
                  severity: sourceConfig.severity || 'info',
                  updated_at: new Date()
                }
              });
              
              console.log(`   ✅ Created warning: ${newWarning.id}`);
            }
          }
        }
      }
    }
    
    // Check final warning count
    const totalWarnings = await prisma.warning.count({
      where: {
        configuration_id: sourceConfig.id
      }
    });
    
    console.log(`\n📊 Final warning count for "Candidate No Source": ${totalWarnings}`);
    
  } catch (error) {
    console.error('❌ Error testing source warnings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  testSourceWarnings().catch(console.error);
}

module.exports = { testSourceWarnings };
